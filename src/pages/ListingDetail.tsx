import { useEffect, useState } from 'react';
import {
  MapPin, Star, ShieldCheck, UtensilsCrossed, BedDouble, Wifi, ArrowLeft,
  ArrowRight, Calendar, CheckCircle2, MessageCircle, Home as HomeIcon,
} from 'lucide-react';
import { supabase, type Listing, type Room, type Profile, type Booking } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Badge, Button, ErrorBanner, Spinner } from '@/components/ui';
import { formatCAD, formatDate, monthsBetween } from '@/lib/format';

const AMENITY_ICONS: Record<string, React.ElementType> = {
  'Wi-Fi': Wifi,
  'Meals included': UtensilsCrossed,
  'Laundry': CheckCircle2,
  'Study desk': CheckCircle2,
  'Air conditioning': CheckCircle2,
  'Parking': CheckCircle2,
};

export function ListingDetailPage({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [host, setHost] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        setLoading(false);
        return;
      }
      const l = data as Listing;
      setListing(l);
      const { data: hostData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', l.host_id)
        .maybeSingle();
      setHost(hostData as Profile | null);
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: true });
      const rs = (roomData as Room[]) ?? [];
      setRooms(rs);
      if (rs.length > 0) setSelectedRoom(rs[0]);
      setLoading(false);
    })();
  }, [id]);

  const months = checkIn && checkOut ? monthsBetween(checkIn, checkOut) : 0;
  const total = selectedRoom ? Number(selectedRoom.price_per_month) * months : 0;

  const handleBook = async () => {
    setBookingError(null);
    if (!user) {
      navigate('/signin');
      return;
    }
    if (profile?.user_type !== 'student') {
      setBookingError('Only student accounts can book homestays. Sign up as a student to reserve a room.');
      return;
    }
    if (!profile.registration_paid) {
      navigate('/register');
      return;
    }
    if (!selectedRoom) {
      setBookingError('Please select a room to book.');
      return;
    }
    if (!checkIn || !checkOut) {
      setBookingError('Please select your check-in and check-out dates.');
      return;
    }
    if (months < 1) {
      setBookingError('Check-out date must be at least one month after check-in.');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        student_id: user.id,
        listing_id: listing!.id,
        room_id: selectedRoom.id,
        check_in: checkIn,
        check_out: checkOut,
        months,
        total_amount: total,
        status: 'pending',
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      setBookingError(error.message);
      return;
    }
    setBooking(data as Booking);
    setBookingSuccess(true);
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    navigate('/signin');
    return null;
  }

  if (profile?.user_type === 'student' && !profile.registration_paid) {
    navigate('/register');
    return null;
  }

  if (!listing) {
    return (
      <div className="pt-16 min-h-screen flex flex-col items-center justify-center px-5">
        <p className="text-sand-600">This listing is no longer available.</p>
        <Button className="mt-4" onClick={() => navigate('/listings')}>Back to listings</Button>
      </div>
    );
  }

  const photos = listing.photo_urls.length > 0
    ? listing.photo_urls
    : ['https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=800&w=1200'];
  const isOwnListing = user?.id === listing.host_id;
  const minPrice = rooms.length > 0 ? Math.min(...rooms.map((r) => Number(r.price_per_month))) : 0;

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-6">
        <button onClick={() => navigate('/listings')} className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to listings
        </button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* LEFT: photos + details + rooms */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl overflow-hidden bg-sand-100 shadow-sm">
              <img src={photos[activePhoto]} alt={listing.title} className="w-full h-72 sm:h-96 object-cover" />
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {photos.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 ${activePhoto === i ? 'border-brand-600' : 'border-transparent'}`}
                  >
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge>{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</Badge>
                    {listing.meals_included && <Badge><UtensilsCrossed className="w-3 h-3" /> Meals included</Badge>}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-sand-900 tracking-tight">{listing.title}</h1>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-sand-600">
                    <MapPin className="w-4 h-4" /> {listing.neighbourhood ? `${listing.neighbourhood}, ` : ''}{listing.city}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-extrabold text-sand-900">{formatCAD(minPrice)}</p>
                  <p className="text-xs text-sand-500">from / month</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-sand-800">
                  <Star className="w-4 h-4 fill-brand-500 text-brand-500" /> 4.9
                </span>
                <span className="flex items-center gap-1.5 text-sand-600"><ShieldCheck className="w-4 h-4 text-brand-600" /> Verified host</span>
                <span className="flex items-center gap-1.5 text-sand-600"><HomeIcon className="w-4 h-4" /> {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</span>
              </div>

              <div className="mt-7 prose prose-sm max-w-none">
                <h2 className="text-lg font-bold text-sand-900 mb-2">About this homestay</h2>
                <p className="text-sand-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>

              {listing.amenities.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-bold text-sand-900 mb-3">What's included</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {listing.amenities.map((a) => {
                      const Icon = AMENITY_ICONS[a] ?? CheckCircle2;
                      return (
                        <div key={a} className="flex items-center gap-2.5 p-3 rounded-xl bg-sand-50 border border-sand-100">
                          <Icon className="w-4.5 h-4.5 text-brand-700 flex-shrink-0" />
                          <span className="text-sm text-sand-700">{a}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rooms section */}
              <div className="mt-8">
                <h2 className="text-lg font-bold text-sand-900 mb-1">Available rooms</h2>
                <p className="text-sm text-sand-500 mb-4">Choose a room to see pricing and book your stay.</p>
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      selected={selectedRoom?.id === room.id}
                      onSelect={() => setSelectedRoom(room)}
                    />
                  ))}
                  {rooms.length === 0 && (
                    <p className="text-sm text-sand-500 py-4 text-center bg-sand-50 rounded-xl">No rooms listed yet.</p>
                  )}
                </div>
              </div>

              {/* Host card */}
              {host && (
                <div className="mt-8 p-5 rounded-2xl bg-white border border-sand-200 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {host.avatar_url ? (
                      <img src={host.avatar_url} alt={host.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <HomeIcon className="w-6 h-6 text-brand-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sand-900">{host.full_name}</p>
                    <p className="text-xs text-sand-500">Host in {host.city || listing.city}{host.country ? `, ${host.country}` : ''}</p>
                    {host.bio && <p className="text-sm text-sand-600 mt-1 line-clamp-2">{host.bio}</p>}
                  </div>
                  <ShieldCheck className="w-6 h-6 text-brand-600 flex-shrink-0" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: booking card */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              {bookingSuccess && booking ? (
                <div className="bg-white rounded-3xl border border-sand-200 shadow-lg p-7 text-center opacity-0-init animate-fade-up">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7 text-brand-700" />
                  </div>
                  <h3 className="text-xl font-extrabold text-sand-900">Booking request sent!</h3>
                  <p className="mt-2 text-sm text-sand-600">
                    Your host has been notified. You'll see updates in your dashboard.
                  </p>
                  <div className="mt-5 p-4 rounded-xl bg-sand-50 text-left text-sm space-y-2">
                    <Row label="Room" value={selectedRoom?.title ?? ''} />
                    <Row label="Check-in" value={formatDate(booking.check_in)} />
                    <Row label="Check-out" value={formatDate(booking.check_out)} />
                    <Row label="Duration" value={`${booking.months} month${booking.months > 1 ? 's' : ''}`} />
                    <Row label="Total" value={formatCAD(Number(booking.total_amount))} bold />
                    <Row label="Status" value="Pending host approval" />
                  </div>
                  <p className="mt-4 text-xs text-sand-500">
                    Payment will be collected securely once your host confirms. You won't be charged now.
                  </p>
                  <Button className="w-full mt-5" onClick={() => navigate('/dashboard')}>
                    Go to dashboard <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-sand-200 shadow-lg p-7">
                  {isOwnListing ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-sand-600 mb-3">This is your homestay listing.</p>
                      <Button className="w-full" onClick={() => navigate(`/listings/${listing.id}/edit`)}>
                        Edit listing
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-2xl font-extrabold text-sand-900">
                          {selectedRoom ? formatCAD(Number(selectedRoom.price_per_month)) : formatCAD(minPrice)}
                        </span>
                        <span className="text-sm text-sand-500">/ month</span>
                      </div>
                      {selectedRoom && (
                        <p className="text-xs text-sand-500 mb-4">
                          Booking: <span className="font-semibold text-sand-700">{selectedRoom.title}</span> · {selectedRoom.room_type} · {selectedRoom.beds} {selectedRoom.beds === 1 ? 'bed' : 'beds'}
                        </p>
                      )}

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="block text-xs font-semibold text-sand-700 mb-1.5">Check-in</span>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                            <input
                              type="date"
                              value={checkIn}
                              min={selectedRoom?.available_from ?? undefined}
                              max={selectedRoom?.available_to ?? undefined}
                              onChange={(e) => setCheckIn(e.target.value)}
                              className="w-full pl-9 pr-2 py-2.5 rounded-lg border border-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="block text-xs font-semibold text-sand-700 mb-1.5">Check-out</span>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                            <input
                              type="date"
                              value={checkOut}
                              min={checkIn || (selectedRoom?.available_from ?? undefined)}
                              max={selectedRoom?.available_to ?? undefined}
                              onChange={(e) => setCheckOut(e.target.value)}
                              className="w-full pl-9 pr-2 py-2.5 rounded-lg border border-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </div>
                        </label>
                      </div>

                      {months > 0 && selectedRoom && (
                        <div className="mt-4 p-4 rounded-xl bg-sand-50 space-y-2 text-sm">
                          <Row label={`${formatCAD(Number(selectedRoom.price_per_month))} × ${months} month${months > 1 ? 's' : ''}`} value={formatCAD(total)} />
                          <div className="h-px bg-sand-200" />
                          <Row label="Total" value={formatCAD(total)} bold />
                        </div>
                      )}

                      {bookingError && <div className="mt-4"><ErrorBanner message={bookingError} /></div>}

                      <Button size="lg" className="w-full mt-5" onClick={handleBook} disabled={submitting || !selectedRoom}>
                        {submitting ? <Spinner /> : <>Request to book <ArrowRight className="w-4 h-4" /></>}
                      </Button>
                      <p className="mt-3 text-center text-xs text-sand-500">You won't be charged yet. Payment is collected after host approval.</p>

                      <div className="mt-5 pt-5 border-t border-sand-100 flex items-center justify-center gap-2 text-sm text-sand-600">
                        <MessageCircle className="w-4 h-4" /> Have a question? Contact your host after booking.
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-sand-500">
                <ShieldCheck className="w-4 h-4 text-brand-600" /> Secure booking &middot; Cancel anytime before host approval
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomCard({ room, selected, onSelect }: {
  room: Room;
  selected: boolean;
  onSelect: () => void;
}) {
  const photo = room.photo_urls?.[0] ?? 'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=300&w=400';
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${
        selected ? 'border-brand-600 shadow-md' : 'border-sand-200 hover:border-sand-300'
      }`}
    >
      <div className="flex gap-4 p-3">
        <img src={photo} alt={room.title} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sand-900 truncate">{room.title}</h3>
            {selected && <CheckCircle2 className="w-5 h-5 text-brand-700 flex-shrink-0" />}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-sand-500">
            <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {room.room_type}</span>
            <span>{room.beds} {room.beds === 1 ? 'bed' : 'beds'}</span>
          </div>
          {room.description && <p className="mt-1.5 text-xs text-sand-600 line-clamp-2">{room.description}</p>}
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-sand-900">{formatCAD(Number(room.price_per_month))}</span>
            <span className="text-xs text-sand-500">/ month</span>
          </div>
        </div>
      </div>
      {room.available_from && room.available_to && (
        <div className="px-3 pb-3">
          <p className="text-xs text-sand-500">Available {formatDate(room.available_from)} to {formatDate(room.available_to)} (max {room.max_stay_months} months)</p>
        </div>
      )}
    </button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sand-600 ${bold ? 'font-semibold text-sand-900' : ''}`}>{label}</span>
      <span className={bold ? 'font-extrabold text-sand-900' : 'font-semibold text-sand-800'}>{value}</span>
    </div>
  );
}
