import { useEffect, useState } from 'react';
import { ArrowLeft, Save, Trash2, Plus, X, ImagePlus, BedDouble, ChevronDown, ChevronUp, Home as HomeIcon } from 'lucide-react';
import { deleteListing, fetchMyListings, saveListing } from '@/lib/api';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Button, ErrorBanner, Spinner } from '@/components/ui';

const CITIES = ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Halifax'];
const ROOM_TYPES = ['Private room', 'Shared room', 'Studio'] as const;
const AMENITY_OPTIONS = ['Wi-Fi', 'Meals included', 'Laundry', 'Study desk', 'Air conditioning', 'Parking'];

const DEFAULT_PHOTOS = [
  'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=700&w=1000',
  'https://images.pexels.com/photos/7147299/pexels-photo-7147299.jpeg?auto=compress&cs=tinysrgb&h=700&w=1000',
  'https://images.pexels.com/photos/30767888/pexels-photo-30767888.jpeg?auto=compress&cs=tinysrgb&h=700&w=1000',
  'https://images.pexels.com/photos/35618218/pexels-photo-35618218.jpeg?auto=compress&cs=tinysrgb&h=700&w=1000',
];

const ROOM_DEFAULT_PHOTOS = [
  'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=500&w=700',
  'https://images.pexels.com/photos/7147299/pexels-photo-7147299.jpeg?auto=compress&cs=tinysrgb&h=500&w=700',
];

interface RoomForm {
  id?: string;
  title: string;
  description: string;
  room_type: typeof ROOM_TYPES[number];
  beds: string;
  price_per_month: string;
  photo_urls: string[];
  available_from: string;
  available_to: string;
  max_stay_months: string;
}

function emptyRoom(): RoomForm {
  return {
    title: '',
    description: '',
    room_type: 'Private room',
    beds: '1',
    price_per_month: '800',
    photo_urls: [ROOM_DEFAULT_PHOTOS[0]],
    available_from: '',
    available_to: '',
    max_stay_months: '12',
  };
}

export function ListingEditor({ listingId }: { listingId?: string }) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Homestay fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Toronto');
  const [neighbourhood, setNeighbourhood] = useState('');
  const [mealsIncluded, setMealsIncluded] = useState(false);
  const [amenities, setAmenities] = useState<string[]>(['Wi-Fi']);
  const [photoUrls, setPhotoUrls] = useState<string[]>([DEFAULT_PHOTOS[0]]);

  // Rooms
  const [rooms, setRooms] = useState<RoomForm[]>([emptyRoom()]);
  const [expandedRoom, setExpandedRoom] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const mine = await fetchMyListings();
        if (!active) return;
        const existing = mine.listings[0];
        if (!listingId) {
          // Un anfitrión tiene un solo homestay: si ya existe, vamos a editarlo.
          if (existing) {
            navigate(`/listings/${existing.id}/edit`);
            return;
          }
          setLoading(false);
          return;
        }
        const l = mine.listings.find((x) => x.id === listingId);
        if (!l) {
          navigate('/dashboard');
          return;
        }
        setTitle(l.title);
        setDescription(l.description);
        setCity(l.city);
        setNeighbourhood(l.neighbourhood);
        setMealsIncluded(l.meals_included);
        setAmenities(l.amenities);
        setPhotoUrls(l.photo_urls.length ? l.photo_urls : [DEFAULT_PHOTOS[0]]);

        const dbRooms = mine.rooms.filter((r) => r.listing_id === listingId);
        if (dbRooms.length > 0) {
          setRooms(dbRooms.map((r) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            room_type: r.room_type,
            beds: String(r.beds),
            price_per_month: String(r.price_per_month),
            photo_urls: r.photo_urls.length ? r.photo_urls : [ROOM_DEFAULT_PHOTOS[0]],
            available_from: r.available_from ?? '',
            available_to: r.available_to ?? '',
            max_stay_months: String(r.max_stay_months),
          })));
        }
      } catch (err) {
        console.error(err);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [listingId, user, navigate]);

  const toggleAmenity = (a: string) => {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const addPhoto = (url: string) => {
    if (url && !photoUrls.includes(url)) setPhotoUrls((prev) => [...prev, url]);
  };

  const updateRoom = (index: number, patch: Partial<RoomForm>) => {
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRoom = () => {
    setRooms((prev) => [...prev, emptyRoom()]);
    setExpandedRoom(rooms.length);
  };

  const removeRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
    setExpandedRoom((prev) => Math.max(0, prev - 1));
  };

  const addRoomPhoto = (index: number, url: string) => {
    if (!url) return;
    setRooms((prev) => prev.map((r, i) =>
      i === index && !r.photo_urls.includes(url)
        ? { ...r, photo_urls: [...r.photo_urls, url] }
        : r
    ));
  };

  const save = async () => {
    setError(null);
    if (!title.trim() || !description.trim() || !city) {
      setError('Please fill in the homestay title, description, and city.');
      return;
    }
    const validRooms = rooms.filter((r) => r.title.trim());
    if (validRooms.length === 0) {
      setError('Please add at least one room with a title.');
      return;
    }
    for (const r of validRooms) {
      if (Number(r.price_per_month) <= 0) {
        setError(`Room "${r.title}" needs a price greater than zero.`);
        return;
      }
      if (Number(r.beds) < 1) {
        setError(`Room "${r.title}" needs at least 1 bed.`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveListing(listingId, {
        title: title.trim(),
        description: description.trim(),
        city,
        neighbourhood: neighbourhood.trim(),
        meals_included: mealsIncluded,
        amenities,
        photo_urls: photoUrls,
        rooms: validRooms.map((r) => ({
          id: r.id,
          title: r.title.trim(),
          description: r.description.trim(),
          room_type: r.room_type,
          beds: Number(r.beds),
          price_per_month: Number(r.price_per_month),
          photo_urls: r.photo_urls,
          available_from: r.available_from || null,
          available_to: r.available_to || null,
          max_stay_months: Number(r.max_stay_months),
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your homestay.');
      setSaving(false);
      return;
    }
    setSaving(false);
    navigate('/dashboard');
  };

  const removeListing = async () => {
    if (!listingId) return;
    if (!confirm('Delete this homestay? All rooms and booking requests will be removed.')) return;
    setSaving(true);
    try {
      await deleteListing(listingId);
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : 'Could not delete this homestay.');
      return;
    }
    setSaving(false);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-sand-50">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-8 pb-20">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <h1 className="text-3xl font-extrabold text-sand-900 tracking-tight">{listingId ? 'Edit homestay' : 'Create your homestay'}</h1>
        <p className="mt-2 text-sand-600 text-sm">Describe your home and add the rooms you have available for international students.</p>

        {/* Homestay details */}
        <div className="mt-8 bg-white rounded-3xl border border-sand-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-sand-100">
            <HomeIcon className="w-5 h-5 text-brand-700" />
            <h2 className="text-lg font-bold text-sand-900">Your home</h2>
          </div>

          <FormField label="Homestay title" hint="A short headline for your home">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Welcome family home near U of T" className={inputCls} />
          </FormField>

          <FormField label="About your home">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe your home, the neighbourhood, and what makes a student feel welcome here..." className={`${inputCls} resize-none`} />
          </FormField>

          <div className="grid sm:grid-cols-2 gap-5">
            <FormField label="City">
              <select value={city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Neighbourhood" hint="Optional">
              <input value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} placeholder="Liberty Village" className={inputCls} />
            </FormField>
          </div>

          <div>
            <span className="block text-sm font-semibold text-sand-800 mb-2">Amenities</span>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition ${
                    amenities.includes(a)
                      ? 'bg-brand-700 text-white border-brand-700'
                      : 'bg-white text-sand-700 border-sand-300 hover:border-sand-400'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={mealsIncluded} onChange={(e) => setMealsIncluded(e.target.checked)} className="w-4.5 h-4.5 accent-brand-700" />
            <span className="text-sm font-medium text-sand-800">Meals included in the monthly price</span>
          </label>

          <div>
            <span className="block text-sm font-semibold text-sand-800 mb-2">Photos of your home</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-sand-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <PhotoPicker onPick={addPhoto} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEFAULT_PHOTOS.map((p) => (
                <button key={p} type="button" onClick={() => addPhoto(p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-sand-100 hover:bg-sand-200 text-sand-700">
                  <Plus className="w-3 h-3" /> Add sample
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rooms section */}
        <div className="mt-6 bg-white rounded-3xl border border-sand-200 shadow-sm p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-sand-100">
            <div className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-brand-700" />
              <h2 className="text-lg font-bold text-sand-900">Rooms ({rooms.length})</h2>
            </div>
            <Button variant="outline" size="sm" onClick={addRoom} type="button">
              <Plus className="w-4 h-4" /> Add room
            </Button>
          </div>

          {rooms.map((room, i) => (
            <RoomEditor
              key={i}
              room={room}
              index={i}
              expanded={expandedRoom === i}
              onToggle={() => setExpandedRoom(expandedRoom === i ? -1 : i)}
              onChange={(patch) => updateRoom(i, patch)}
              onRemove={() => removeRoom(i)}
              onAddPhoto={(url) => addRoomPhoto(i, url)}
              canRemove={rooms.length > 1}
            />
          ))}

          {rooms.length === 0 && (
            <p className="text-sm text-sand-500 text-center py-4">No rooms yet. Add at least one room to publish your homestay.</p>
          )}
        </div>

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <div className="mt-6 flex items-center justify-between">
          {listingId ? (
            <button onClick={removeListing} className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium" disabled={saving}>
              <Trash2 className="w-4 h-4" /> Delete homestay
            </button>
          ) : <span />}
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? <Spinner /> : <><Save className="w-4 h-4" /> {listingId ? 'Save changes' : 'Publish homestay'}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RoomEditor({ room, index, expanded, onToggle, onChange, onRemove, onAddPhoto, canRemove }: {
  room: RoomForm;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<RoomForm>) => void;
  onRemove: () => void;
  onAddPhoto: (url: string) => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-sand-50">
        <button type="button" onClick={onToggle} className="flex items-center gap-2 flex-1 text-left min-w-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-sand-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-sand-500 flex-shrink-0" />}
          <BedDouble className="w-4 h-4 text-brand-700 flex-shrink-0" />
          <span className="font-semibold text-sm text-sand-900 truncate">
            {room.title || `Room ${index + 1}`}
          </span>
          <span className="text-xs text-sand-500 flex-shrink-0">
            {room.room_type} · {room.beds} {Number(room.beds) === 1 ? 'bed' : 'beds'} · ${room.price_per_month}/mo
          </span>
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove} className="w-7 h-7 rounded-lg text-sand-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          <FormField label="Room title" hint="e.g. Master bedroom, Cozy attic room">
            <input value={room.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Sunny private room" className={inputCls} />
          </FormField>

          <FormField label="Room description" hint="Optional — describe this specific room">
            <textarea value={room.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} placeholder="Bright south-facing room with a study desk and closet..." className={`${inputCls} resize-none`} />
          </FormField>

          <div className="grid sm:grid-cols-3 gap-4">
            <FormField label="Room type">
              <select value={room.room_type} onChange={(e) => onChange({ room_type: e.target.value as typeof ROOM_TYPES[number] })} className={inputCls}>
                {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FormField>
            <FormField label="Number of beds">
              <input type="number" min="1" max="6" value={room.beds} onChange={(e) => onChange({ beds: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Price / month (CAD)">
              <input type="number" min="0" value={room.price_per_month} onChange={(e) => onChange({ price_per_month: e.target.value })} className={inputCls} />
            </FormField>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <FormField label="Available from" hint="Optional">
              <input type="date" value={room.available_from} onChange={(e) => onChange({ available_from: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Available to" hint="Optional">
              <input type="date" value={room.available_to} onChange={(e) => onChange({ available_to: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Max stay (months)">
              <input type="number" min="1" value={room.max_stay_months} onChange={(e) => onChange({ max_stay_months: e.target.value })} className={inputCls} />
            </FormField>
          </div>

          <div>
            <span className="block text-sm font-semibold text-sand-800 mb-2">Room photos</span>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-2">
              {room.photo_urls.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-sand-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onChange({ photo_urls: room.photo_urls.filter((_, idx) => idx !== i) })}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <PhotoPicker onPick={onAddPhoto} />
            </div>
            <div className="flex flex-wrap gap-2">
              {ROOM_DEFAULT_PHOTOS.map((p) => (
                <button key={p} type="button" onClick={() => onAddPhoto(p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-sand-100 hover:bg-sand-200 text-sand-700">
                  <Plus className="w-3 h-3" /> Add sample
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-sand-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition';

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-sand-800 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-sand-500 mt-1">{hint}</span>}
    </label>
  );
}

function PhotoPicker({ onPick }: { onPick: (url: string) => void }) {
  const [url, setUrl] = useState('');
  return (
    <div className="aspect-square rounded-xl border-2 border-dashed border-sand-300 flex flex-col items-center justify-center gap-2 p-2 text-center hover:border-brand-400 transition">
      <ImagePlus className="w-6 h-6 text-sand-400" />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste image URL"
        className="w-full text-xs px-2 py-1.5 rounded-lg border border-sand-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button
        type="button"
        onClick={() => { if (url) { onPick(url); setUrl(''); } }}
        className="text-xs font-semibold text-brand-700 hover:underline"
      >
        Add
      </button>
    </div>
  );
}
