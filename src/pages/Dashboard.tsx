import { useEffect, useState } from 'react';
import {
  Plus, Edit3, MapPin, Calendar, Trash2, Home as HomeIcon, GraduationCap,
  CheckCircle2, Clock, XCircle, ArrowRight, Save, LayoutDashboard, User as UserIcon,
  BedDouble,
} from 'lucide-react';
import { supabase, type Listing, type Room, type Booking, type Profile } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Button, EmptyState, ErrorBanner, Spinner } from '@/components/ui';
import { formatCAD, formatDate } from '@/lib/format';

type Tab = 'overview' | 'listings' | 'bookings' | 'profile';

export function DashboardPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [listings, setListings] = useState<Listing[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<(Booking & { listing?: Listing; student?: Profile })[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const isHost = profile?.user_type === 'host';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/signin');
      return;
    }
    (async () => {
      setDataLoading(true);
      if (isHost) {
        const { data: l } = await supabase.from('listings').select('*').eq('host_id', user.id).order('created_at', { ascending: false });
        setListings((l as Listing[]) ?? []);
        if (l && l.length > 0) {
          const { data: r } = await supabase.from('rooms').select('*').in('listing_id', l.map((x) => x.id)).order('created_at', { ascending: true });
          setRooms((r as Room[]) ?? []);
        }
        const { data: b } = await supabase
          .from('bookings')
          .select('*, listing:listings(*), student:profiles(*)')
          .order('created_at', { ascending: false });
        setBookings((b as (Booking & { listing: Listing; student: Profile })[]) ?? []);
      } else {
        const { data: b } = await supabase
          .from('bookings')
          .select('*, listing:listings(*)')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });
        setBookings((b as (Booking & { listing: Listing })[]) ?? []);
      }
      setDataLoading(false);
    })();
  }, [user, profile, loading, isHost, navigate]);

  if (loading) {
    return <div className="pt-16 min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  }
  if (!user || !profile) {
    navigate('/signin');
    return null;
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = isHost
    ? [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'listings', label: 'My Homestay', icon: HomeIcon },
        { id: 'bookings', label: 'Booking Requests', icon: Calendar },
        { id: 'profile', label: 'Profile', icon: UserIcon },
      ]
    : [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'bookings', label: 'My Bookings', icon: Calendar },
        { id: 'profile', label: 'Profile', icon: UserIcon },
      ];

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const totalEarnings = isHost
    ? bookings.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + Number(b.total_amount), 0)
    : 0;
  const totalSpent = !isHost
    ? bookings.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + Number(b.total_amount), 0)
    : 0;

  return (
    <div className="pt-16 min-h-screen bg-sand-50">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-20">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-11 h-11 rounded-xl bg-brand-700 text-white flex items-center justify-center">
            {isHost ? <HomeIcon className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-sand-900 tracking-tight">Welcome, {profile.full_name.split(' ')[0]}</h1>
            <p className="text-sm text-sand-500">{isHost ? 'Host dashboard' : 'Student dashboard'}</p>
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-sand-200 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t.id ? 'border-brand-700 text-brand-700' : 'border-transparent text-sand-500 hover:text-sand-800'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {t.id === 'bookings' && pendingCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-brand-700 text-white">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'overview' && (
            <Overview
              isHost={isHost}
              listings={listings}
              rooms={rooms}
              bookings={bookings}
              pendingCount={pendingCount}
              confirmedCount={confirmedCount}
              totalEarnings={totalEarnings}
              totalSpent={totalSpent}
              navigate={navigate}
              registrationPaid={profile.registration_paid}
            />
          )}
          {tab === 'listings' && isHost && (
            <ListingsTab listings={listings} rooms={rooms} loading={dataLoading} navigate={navigate} />
          )}
          {tab === 'bookings' && (
            <BookingsTab bookings={bookings} isHost={isHost} loading={dataLoading} navigate={navigate} userId={user.id} onUpdate={() => setTab('bookings')} registrationPaid={profile.registration_paid} />
          )}
          {tab === 'profile' && (
            <ProfileTab profile={profile} onSave={refreshProfile} signOut={signOut} navigate={navigate} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-sand-900">{value}</p>
      <p className="text-sm text-sand-500">{label}</p>
    </div>
  );
}

function Overview({ isHost, listings, rooms, bookings, pendingCount, confirmedCount, totalEarnings, totalSpent, navigate, registrationPaid }: {
  isHost: boolean;
  listings: Listing[];
  rooms: Room[];
  bookings: (Booking & { listing?: Listing; student?: Profile })[];
  pendingCount: number;
  confirmedCount: number;
  totalEarnings: number;
  totalSpent: number;
  navigate: (to: string) => void;
  registrationPaid: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isHost ? (
          <>
            <StatCard label="Rooms available" value={String(rooms.length)} icon={BedDouble} accent="bg-brand-50 text-brand-700" />
            <StatCard label="Pending requests" value={String(pendingCount)} icon={Clock} accent="bg-amber-50 text-amber-600" />
            <StatCard label="Confirmed bookings" value={String(confirmedCount)} icon={CheckCircle2} accent="bg-green-50 text-green-600" />
            <StatCard label="Total earnings" value={formatCAD(totalEarnings)} icon={LayoutDashboard} accent="bg-brand-700 text-white" />
          </>
        ) : (
          <>
            <StatCard label="Total bookings" value={String(bookings.length)} icon={Calendar} accent="bg-brand-50 text-brand-700" />
            <StatCard label="Pending" value={String(pendingCount)} icon={Clock} accent="bg-amber-50 text-amber-600" />
            <StatCard label="Confirmed" value={String(confirmedCount)} icon={CheckCircle2} accent="bg-green-50 text-green-600" />
            <StatCard label="Total spent" value={formatCAD(totalSpent)} icon={LayoutDashboard} accent="bg-brand-700 text-white" />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-sand-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sand-900">{isHost ? 'Next steps' : 'Get started'}</h3>
        </div>
        {isHost ? (
          listings.length === 0 ? (
            <div className="flex flex-col items-center text-center py-6">
              <p className="text-sand-600 text-sm max-w-md">You haven't listed your homestay yet. Create your listing to start receiving booking requests from international students.</p>
              <Button className="mt-4" onClick={() => navigate('/listings/new')}>
                <Plus className="w-4 h-4" /> Create your homestay listing
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-sand-600">Your homestay is live with {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}. You can edit it anytime to update rooms, photos, or availability.</p>
              <Button onClick={() => navigate(`/listings/${listings[0].id}/edit`)}><Edit3 className="w-4 h-4" /> Edit homestay</Button>
            </div>
          )
        ) : !registrationPaid ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </span>
              <p className="text-sm text-sand-600">Your registration fee is pending. Pay now to unlock homestay browsing and booking.</p>
            </div>
            <Button onClick={() => navigate('/register')}>Pay registration fee <ArrowRight className="w-4 h-4" /></Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-sand-600">Find your homestay in Canada. Browse verified rooms and book your stay.</p>
            <Button onClick={() => navigate('/listings')}>Browse homestays <ArrowRight className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      {bookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-sand-200 p-6 shadow-sm">
          <h3 className="font-bold text-sand-900 mb-4">Recent activity</h3>
          <div className="space-y-3">
            {bookings.slice(0, 4).map((b) => (
              <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl bg-sand-50">
                <StatusBadge status={b.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sand-900 truncate">{b.listing?.title ?? 'Listing removed'}</p>
                  <p className="text-xs text-sand-500">{formatDate(b.check_in)} → {formatDate(b.check_out)}</p>
                </div>
                <span className="text-sm font-bold text-sand-900 flex-shrink-0">{formatCAD(Number(b.total_amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingsTab({ listings, rooms, loading, navigate }: { listings: Listing[]; rooms: Room[]; loading: boolean; navigate: (to: string) => void }) {
  if (loading) return <div className="py-12 flex justify-center"><Spinner className="w-7 h-7" /></div>;
  if (listings.length === 0) {
    return (
      <EmptyState
        title="No homestay listing yet"
        message="Create your homestay listing to start welcoming international students into your home."
        action={<Button onClick={() => navigate('/listings/new')}><Plus className="w-4 h-4" /> Create listing</Button>}
      />
    );
  }
  const listing = listings[0];
  const listingRooms = rooms.filter((r) => r.listing_id === listing.id);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate(`/listings/${listing.id}/edit`)} size="sm"><Edit3 className="w-4 h-4" /> Edit homestay</Button>
      </div>

      {/* Homestay summary */}
      <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <img
            src={listing.photo_urls[0] ?? 'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=200&w=200'}
            alt={listing.title}
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sand-900 text-lg">{listing.title}</p>
            <p className="text-sm text-sand-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {listing.neighbourhood ? `${listing.neighbourhood}, ` : ''}{listing.city}</p>
            <p className="text-sm text-sand-500 mt-1 line-clamp-2">{listing.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {listing.meals_included && <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">Meals included</span>}
              {listing.amenities.slice(0, 3).map((a) => (
                <span key={a} className="text-xs font-semibold text-sand-600 bg-sand-100 px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate(`/listings/${listing.id}`)}>View</Button>
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sand-900 flex items-center gap-2"><BedDouble className="w-4 h-4 text-brand-700" /> Rooms ({listingRooms.length})</h3>
          <Button variant="outline" size="sm" onClick={() => navigate(`/listings/${listing.id}/edit`)}>
            <Plus className="w-4 h-4" /> Add room
          </Button>
        </div>
        {listingRooms.length === 0 ? (
          <p className="text-sm text-sand-500 text-center py-4">No rooms yet. Edit your homestay to add rooms.</p>
        ) : (
          <div className="space-y-3">
            {listingRooms.map((room) => (
              <div key={room.id} className="flex items-center gap-4 p-3 rounded-xl bg-sand-50 border border-sand-100">
                <img
                  src={room.photo_urls[0] ?? 'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=120&w=120'}
                  alt={room.title}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sand-900 truncate">{room.title}</p>
                  <p className="text-xs text-sand-500 flex items-center gap-2">
                    <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> {room.room_type}</span>
                    <span>{room.beds} {room.beds === 1 ? 'bed' : 'beds'}</span>
                  </p>
                </div>
                <span className="text-sm font-bold text-brand-700 flex-shrink-0">{formatCAD(Number(room.price_per_month))}/mo</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingsTab({ bookings, isHost, loading, navigate, userId, onUpdate, registrationPaid }: {
  bookings: (Booking & { listing?: Listing; student?: Profile })[];
  isHost: boolean;
  loading: boolean;
  navigate: (to: string) => void;
  userId: string;
  onUpdate: () => void;
  registrationPaid: boolean;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (bookingId: string, status: Booking['status']) => {
    setUpdating(bookingId);
    setError(null);
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
    setUpdating(null);
    if (error) { setError(error.message); return; }
    onUpdate();
  };

  if (loading) return <div className="py-12 flex justify-center"><Spinner className="w-7 h-7" /></div>;
  if (bookings.length === 0) {
    return (
      <EmptyState
        title={isHost ? 'No booking requests yet' : 'No bookings yet'}
        message={isHost ? 'When students request to stay at your homestay, they\'ll appear here.' : 'Browse homestays and request a booking to see it here.'}
        action={!isHost && <Button onClick={() => navigate(registrationPaid ? '/listings' : '/register')}>{registrationPaid ? 'Browse homestays' : 'Pay registration fee'}</Button>}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error && <ErrorBanner message={error} />}
      {bookings.map((b) => {
        const isStudent = b.student_id === userId;
        return (
          <div key={b.id} className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src={b.listing?.photo_urls?.[0] ?? 'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=200&w=300'}
                alt={b.listing?.title ?? ''}
                className="w-full sm:w-28 h-28 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={b.status} />
                  <span className="text-sm font-bold text-sand-900">{formatCAD(Number(b.total_amount))}</span>
                </div>
                <button onClick={() => b.listing && navigate(`/listings/${b.listing.id}`)} className="font-bold text-sand-900 hover:text-brand-700 text-left">
                  {b.listing?.title ?? 'Listing removed'}
                </button>
                <p className="text-sm text-sand-500 mt-0.5">
                  {b.listing && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {b.listing.city} &middot; </span>}
                  {formatDate(b.check_in)} → {formatDate(b.check_out)} ({b.months}mo)
                </p>
                {isHost && b.student && (
                  <p className="text-xs text-sand-500 mt-1">Student: {b.student.full_name}{b.student.country ? ` from ${b.student.country}` : ''}</p>
                )}
              </div>

              {isHost && b.status === 'pending' && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" onClick={() => updateStatus(b.id, 'confirmed')} disabled={updating === b.id}>
                    <CheckCircle2 className="w-4 h-4" /> Confirm
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'cancelled')} disabled={updating === b.id}>
                    <XCircle className="w-4 h-4" /> Decline
                  </Button>
                </div>
              )}
              {!isHost && b.status === 'pending' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, 'cancelled')} disabled={updating === b.id}>
                  Cancel request
                </Button>
              )}
              {updating === b.id && <Spinner className="w-5 h-5" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProfileTab({ profile, onSave, signOut, navigate }: {
  profile: Profile;
  onSave: () => Promise<void>;
  signOut: () => Promise<void>;
  navigate: (to: string) => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone);
  const [country, setCountry] = useState(profile.country);
  const [city, setCity] = useState(profile.city);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, country, city, bio, avatar_url: avatarUrl })
      .eq('id', profile.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-sand-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-7 h-7 text-brand-700" />}
          </div>
          <div>
            <p className="font-bold text-sand-900">{profile.full_name || 'Your name'}</p>
            <p className="text-sm text-sand-500 capitalize">{profile.user_type}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Full name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 416 555 0123" className={inputCls} /></Field>
          <Field label={profile.user_type === 'student' ? 'Home country' : 'Country'}>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Canada" className={inputCls} />
          </Field>
          <Field label={profile.user_type === 'student' ? 'Destination city' : 'Hosting city'}>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Toronto" className={inputCls} />
          </Field>
        </div>
        <Field label="Avatar URL" hint="Optional — paste a link to a profile photo">
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className={inputCls} />
        </Field>
        <Field label="About">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell students or hosts a bit about yourself..." className={`${inputCls} resize-none`} />
        </Field>

        {error && <ErrorBanner message={error} />}

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => { signOut(); navigate('/'); }} className="text-sm text-sand-500 hover:text-red-600 font-medium">Sign out</button>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-brand-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
            <Button onClick={save} disabled={saving}>{saving ? <Spinner /> : <><Save className="w-4 h-4" /> Save profile</>}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const map = {
    pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
    confirmed: { cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2, label: 'Confirmed' },
    cancelled: { cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Cancelled' },
    completed: { cls: 'bg-sand-100 text-sand-700 border-sand-200', icon: CheckCircle2, label: 'Completed' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border ${s.cls}`}>
      <s.icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-sand-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sand-800 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-sand-500 mt-1">{hint}</span>}
    </label>
  );
}
