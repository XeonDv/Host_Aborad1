import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, MapPin, X } from 'lucide-react';
import { fetchListings } from '@/lib/api';
import type { Listing } from '@/lib/types';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { ListingCard } from '@/components/ListingCard';
import { Button, EmptyState, ListingCardSkeleton, Section, Spinner } from '@/components/ui';

const CITIES = ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Halifax'];
const ROOM_TYPES = ['Private room', 'Shared room', 'Studio'];
const AMENITY_OPTIONS = ['Wi-Fi', 'Meals included', 'Laundry', 'Study desk', 'Air conditioning', 'Parking'];

export function ListingsPage() {
  const { path, navigate } = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState<string>('');
  const [roomType, setRoomType] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [mealsOnly, setMealsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(path.split('?')[1] ?? '');
    const cityParam = params.get('city');
    if (cityParam) setCity(cityParam);
  }, [path]);

  const userId = user?.id;
  useEffect(() => {
    if (authLoading || !userId) return;
    let active = true;
    setLoading(true);
    fetchListings({ city, roomType, mealsOnly, maxPrice })
      .then((ls) => {
        if (!active) return;
        setListings(ls);
        setRoomCounts(Object.fromEntries(ls.map((l) => [l.id, l.room_count])));
      })
      .catch((err) => console.error(err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, userId, city, roomType, maxPrice, mealsOnly]);

  const filtered = useMemo(() => {
    if (!search.trim()) return listings;
    const q = search.toLowerCase();
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.neighbourhood?.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q),
    );
  }, [listings, search]);

  if (authLoading) {
    return <div className="pt-16 min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  }

  if (!user) {
    navigate('/signin');
    return null;
  }

  if (profile?.user_type === 'student' && !profile.registration_paid) {
    navigate('/register');
    return null;
  }

  const clearFilters = () => {
    setCity('');
    setRoomType('');
    setMaxPrice('');
    setMealsOnly(false);
    setSearch('');
    navigate('/listings');
  };

  const activeFilterCount = [city, roomType, maxPrice !== '' ? '1' : '', mealsOnly ? '1' : ''].filter(Boolean).length;

  return (
    <div className="pt-16 min-h-screen">
      <Section className="pt-10 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-sand-900 tracking-tight">Browse homestays</h1>
        <p className="mt-2 text-sand-600">Find a verified host family in your destination city.</p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-sand-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city, neighbourhood, or keyword..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className="sm:w-auto justify-center"
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-brand-700 text-white">{activeFilterCount}</span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 bg-white rounded-2xl border border-sand-200 p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 opacity-0-init animate-fade-in">
            <FilterGroup label="City">
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-sand-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FilterGroup>
            <FilterGroup label="Room type">
              <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-sand-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Any type</option>
                {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FilterGroup>
            <FilterGroup label="Max budget / month">
              <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg border border-sand-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Any price</option>
                <option value="800">Up to $800</option>
                <option value="1000">Up to $1,000</option>
                <option value="1200">Up to $1,200</option>
                <option value="1500">Up to $1,500</option>
              </select>
            </FilterGroup>
            <FilterGroup label="Meals">
              <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-sand-300 cursor-pointer hover:bg-sand-50">
                <input type="checkbox" checked={mealsOnly} onChange={(e) => setMealsOnly(e.target.checked)} className="w-4 h-4 accent-brand-700" />
                <span className="text-sm text-sand-700">Meals included only</span>
              </label>
            </FilterGroup>
            {activeFilterCount > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-red-600">
                  <X className="w-4 h-4" /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      <Section className="pb-20">
        <p className="text-sm text-sand-500 mb-5">
          {loading ? 'Searching...' : `${filtered.length} ${filtered.length === 1 ? 'homestay' : 'homestays'} found`}
          {city && <> in <span className="font-semibold text-sand-800">{city}</span></>}
        </p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No homestays match your search"
            message="Try removing some filters or searching a different city. New listings are added every week."
            action={<Button onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((l) => <ListingCard key={l.id} listing={l} roomCount={roomCounts[l.id]} />)}
          </div>
        )}
      </Section>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-sand-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
