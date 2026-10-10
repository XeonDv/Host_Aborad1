import { useEffect, useState } from 'react';
import {
  Users, Home as HomeIcon, Calendar, DollarSign, ShieldCheck, Search,
  GraduationCap, MapPin, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminBooking, AdminListing, AdminProfile as Profile } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Button, Spinner, ErrorBanner } from '@/components/ui';
import { formatCAD, formatDate } from '@/lib/format';

type AdminTab = 'overview' | 'students' | 'hosts' | 'listings' | 'bookings';

export function AdminPage() {
  const { user, profile, loading } = useAuth();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.user_type !== 'admin') {
      navigate('/dashboard');
      return;
    }
    (async () => {
      setDataLoading(true);
      setError(null);
      try {
        const [profRes, listRes, bookRes] = await Promise.all([
          adminApi.profiles(),
          adminApi.listings(),
          adminApi.bookings(),
        ]);
        setProfiles(profRes);
        setListings(listRes);
        setBookings(bookRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load admin data.');
      }
      setDataLoading(false);
    })();
  }, [user, profile, loading, navigate]);

  if (loading) {
    return <div className="pt-16 min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  }
  if (!user || profile?.user_type !== 'admin') {
    navigate('/dashboard');
    return null;
  }

  const students = profiles.filter((p) => p.user_type === 'student');
  const hosts = profiles.filter((p) => p.user_type === 'host');
  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const paidStudents = students.filter((s) => s.registration_paid).length;

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'hosts', label: 'Hosts', icon: HomeIcon },
    { id: 'listings', label: 'Homestays', icon: MapPin },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
  ];

  const matchesSearch = (text: string): boolean => {
    if (!search.trim()) return true;
    return text.toLowerCase().includes(search.toLowerCase());
  };

  return (
    <div className="pt-16 min-h-screen bg-sand-50">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-8 pb-20">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-11 h-11 rounded-xl bg-sand-900 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-sand-900 tracking-tight">Admin Panel</h1>
            <p className="text-sm text-sand-500">Manage students, hosts, listings, and bookings</p>
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-sand-200 overflow-x-auto scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t.id ? 'border-sand-900 text-sand-900' : 'border-transparent text-sand-500 hover:text-sand-800'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {t.id === 'bookings' && pendingBookings > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-white">{pendingBookings}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

          {tab !== 'overview' && (
            <div className="mb-4 relative max-w-sm">
              <Search className="w-4 h-4 text-sand-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${tab}...`}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sand-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sand-400"
              />
            </div>
          )}

          {dataLoading ? (
            <div className="py-12 flex justify-center"><Spinner className="w-7 h-7" /></div>
          ) : (
            <>
              {tab === 'overview' && (
                <OverviewTab
                  students={students.length}
                  hosts={hosts.length}
                  listings={listings.length}
                  bookings={bookings.length}
                  pendingBookings={pendingBookings}
                  totalRevenue={totalRevenue}
                  paidStudents={paidStudents}
                />
              )}
              {tab === 'students' && (
                <StudentsTab
                  students={students.filter((s) =>
                    matchesSearch(`${s.full_name} ${s.country} ${s.city} ${s.id}`)
                  )}
                />
              )}
              {tab === 'hosts' && (
                <HostsTab
                  hosts={hosts.filter((h) =>
                    matchesSearch(`${h.full_name} ${h.country} ${h.city} ${h.id}`)
                  )}
                  listings={listings}
                />
              )}
              {tab === 'listings' && (
                <ListingsTab
                  listings={listings.filter((l) =>
                    matchesSearch(`${l.title} ${l.city} ${l.host_name} ${l.host_email}`)
                  )}
                  navigate={navigate}
                />
              )}
              {tab === 'bookings' && (
                <BookingsTab
                  bookings={bookings.filter((b) =>
                    matchesSearch(`${b.listing_title} ${b.listing_city} ${b.student_name} ${b.student_email} ${b.status}`)
                  )}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </span>
      <p className="mt-3 text-2xl font-extrabold text-sand-900">{value}</p>
      <p className="text-sm text-sand-500">{label}</p>
    </div>
  );
}

function OverviewTab({ students, hosts, listings, bookings, pendingBookings, totalRevenue, paidStudents }: {
  students: number; hosts: number; listings: number; bookings: number;
  pendingBookings: number; totalRevenue: number; paidStudents: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Students" value={String(students)} icon={GraduationCap} accent="bg-brand-50 text-brand-700" />
        <StatCard label="Hosts" value={String(hosts)} icon={HomeIcon} accent="bg-sand-100 text-sand-800" />
        <StatCard label="Homestays" value={String(listings)} icon={MapPin} accent="bg-brand-50 text-brand-700" />
        <StatCard label="Total bookings" value={String(bookings)} icon={Calendar} accent="bg-sand-100 text-sand-800" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending bookings" value={String(pendingBookings)} icon={Clock} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Paid students" value={`${paidStudents}/${students}`} icon={CheckCircle2} accent="bg-green-50 text-green-600" />
        <StatCard label="Total revenue" value={formatCAD(totalRevenue)} icon={DollarSign} accent="bg-brand-700 text-white" />
        <StatCard label="Conversion" value={students > 0 ? `${Math.round((paidStudents / students) * 100)}%` : '—'} icon={ShieldCheck} accent="bg-sand-100 text-sand-800" />
      </div>

      <div className="bg-white rounded-2xl border border-sand-200 p-6 shadow-sm">
        <h3 className="font-bold text-sand-900 mb-2">How to use this panel</h3>
        <p className="text-sm text-sand-600 leading-relaxed">
          Use the tabs above to view all registered students, hosts, homestay listings, and booking requests.
          The search bar filters by name, city, or email. This is a read-only admin view — to make changes to a
          listing or booking, use the host or student dashboard directly.
        </p>
      </div>
    </div>
  );
}

function StudentsTab({ students }: { students: Profile[] }) {
  if (students.length === 0) {
    return <p className="text-sm text-sand-500 py-8 text-center">No students found.</p>;
  }
  return (
    <div className="bg-white rounded-2xl border border-sand-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sand-50 text-sand-600 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">Country</th>
              <th className="text-left px-4 py-3 font-semibold">Destination</th>
              <th className="text-left px-4 py-3 font-semibold">Reg. Fee</th>
              <th className="text-left px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-sand-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <GraduationCap className="w-4 h-4 text-brand-700" />}
                    </div>
                    <span className="font-semibold text-sand-900">{s.full_name || 'Unnamed'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sand-600">{s.country || '—'}</td>
                <td className="px-4 py-3 text-sand-600">{s.city || '—'}</td>
                <td className="px-4 py-3">
                  {s.registration_paid ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sand-500 text-xs">{formatDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HostsTab({ hosts, listings }: { hosts: Profile[]; listings: AdminListing[] }) {
  if (hosts.length === 0) {
    return <p className="text-sm text-sand-500 py-8 text-center">No hosts found.</p>;
  }
  return (
    <div className="bg-white rounded-2xl border border-sand-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sand-50 text-sand-600 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold">Name</th>
              <th className="text-left px-4 py-3 font-semibold">City</th>
              <th className="text-left px-4 py-3 font-semibold">Homestays</th>
              <th className="text-left px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {hosts.map((h) => {
              const count = listings.filter((l) => l.host_id === h.id).length;
              return (
                <tr key={h.id} className="hover:bg-sand-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-sand-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {h.avatar_url
                          ? <img src={h.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <HomeIcon className="w-4 h-4 text-sand-700" />}
                      </div>
                      <span className="font-semibold text-sand-900">{h.full_name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sand-600">{h.city || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sand-900">{count}</span>
                  </td>
                  <td className="px-4 py-3 text-sand-500 text-xs">{formatDate(h.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListingsTab({ listings, navigate }: { listings: AdminListing[]; navigate: (to: string) => void }) {
  if (listings.length === 0) {
    return <p className="text-sm text-sand-500 py-8 text-center">No listings found.</p>;
  }
  return (
    <div className="space-y-3">
      {listings.map((l) => (
        <div key={l.id} className="bg-white rounded-2xl border border-sand-200 p-4 shadow-sm flex items-center gap-4">
          <img
            src={l.photo_urls[0] ?? 'https://images.pexels.com/photos/6510421/pexels-photo-6510421.jpeg?auto=compress&cs=tinysrgb&h=200&w=200'}
            alt={l.title}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sand-900 truncate">{l.title}</p>
            <p className="text-sm text-sand-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {l.city}
              {l.neighbourhood && <span className="text-sand-400"> · {l.neighbourhood}</span>}
            </p>
            <p className="text-xs text-sand-400 mt-0.5">Host: {l.host_name || 'Unknown'} ({l.host_email || 'no email'})</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-brand-700">{formatCAD(Number(l.price_per_month))}/mo</p>
            <Button variant="outline" size="sm" className="mt-1" onClick={() => navigate(`/listings/${l.id}`)}>View</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingsTab({ bookings }: { bookings: AdminBooking[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-sand-500 py-8 text-center">No bookings found.</p>;
  }
  const statusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
      pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Pending' },
      confirmed: { cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2, label: 'Confirmed' },
      cancelled: { cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, label: 'Cancelled' },
      completed: { cls: 'bg-sand-100 text-sand-700 border-sand-200', icon: CheckCircle2, label: 'Completed' },
    };
    const s = map[status] ?? map.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${s.cls}`}>
        <s.icon className="w-3 h-3" /> {s.label}
      </span>
    );
  };
  return (
    <div className="bg-white rounded-2xl border border-sand-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sand-50 text-sand-600 text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold">Student</th>
              <th className="text-left px-4 py-3 font-semibold">Listing</th>
              <th className="text-left px-4 py-3 font-semibold">Dates</th>
              <th className="text-left px-4 py-3 font-semibold">Amount</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-sand-50/50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-sand-900">{b.student_name || 'Unknown'}</p>
                  <p className="text-xs text-sand-400">{b.student_email || ''}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sand-700">{b.listing_title || 'Listing removed'}</p>
                  <p className="text-xs text-sand-400">{b.listing_city || ''}</p>
                </td>
                <td className="px-4 py-3 text-sand-600 text-xs">
                  {formatDate(b.check_in)} → {formatDate(b.check_out)}<br />
                  <span className="text-sand-400">{b.months} months</span>
                </td>
                <td className="px-4 py-3 font-bold text-sand-900">{formatCAD(Number(b.total_amount))}</td>
                <td className="px-4 py-3">{statusBadge(b.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
