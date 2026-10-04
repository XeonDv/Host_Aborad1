import { useEffect, useState } from 'react';
import { Menu, X, LayoutDashboard, LogOut, Compass, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { navigate, path } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'How it Works', to: '/#how-it-works' },
    { label: 'Cities', to: '/#cities' },
    { label: 'For Hosts', to: '/#hosts' },
  ];

  const go = (to: string) => {
    setMenuOpen(false);
    if (to.startsWith('/#')) {
      navigate('/');
      setTimeout(() => {
        const id = to.slice(2);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      navigate(to);
    }
  };

  const isLanding = path === '/';

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled || !isLanding
          ? 'bg-white/85 backdrop-blur-lg shadow-sm border-b border-sand-200/60'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <button onClick={() => go('/')} className="flex items-center gap-2.5 group">
          <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-brand-100 group-hover:scale-105 transition-transform">
            <img src="/Logo_Host_Abroad_Inc..png" alt="Host Abroad Inc." className="w-full h-full object-cover" />
          </span>
          <span className={`font-extrabold text-lg tracking-tight ${scrolled || !isLanding ? 'text-sand-900' : 'text-sand-900'}`}>
            Host<span className="text-brand-600">Abroad</span><span className="text-sand-700">.ca</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.to}
              onClick={() => go(link.to)}
              className="px-3.5 py-2 text-sm font-medium text-sand-700 hover:text-brand-700 hover:bg-brand-50/60 rounded-lg transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {profile?.user_type === 'admin' && (
                <button
                  onClick={() => go('/admin')}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-sand-900 hover:bg-sand-800 rounded-lg transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </button>
              )}
              <button
                onClick={() => go('/dashboard')}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-sand-700 hover:text-brand-700 hover:bg-brand-50/60 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => { signOut(); go('/'); }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-sand-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => go('/signin')}
                className="px-3.5 py-2 text-sm font-medium text-sand-700 hover:text-brand-700 hover:bg-brand-50/60 rounded-lg transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => go('/signup')}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 rounded-lg shadow-sm hover:shadow transition-all"
              >
                Get started
              </button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-sand-100"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-6 h-6 text-sand-800" /> : <Menu className="w-6 h-6 text-sand-800" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden bg-white border-b border-sand-200 shadow-lg">
          <div className="px-5 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => go(link.to)}
                className="text-left px-3 py-2.5 text-sm font-medium text-sand-700 hover:bg-brand-50 rounded-lg"
              >
                {link.label}
              </button>
            ))}
            <div className="h-px bg-sand-200 my-2" />
            {user ? (
              <>
                {profile?.user_type === 'admin' && (
                  <button onClick={() => go('/admin')} className="text-left flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-sand-900 rounded-lg">
                    <ShieldCheck className="w-4 h-4" /> Admin Panel
                  </button>
                )}
                <button onClick={() => go('/dashboard')} className="text-left flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-sand-700 hover:bg-brand-50 rounded-lg">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button onClick={() => { signOut(); go('/'); }} className="text-left flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-sand-700 hover:bg-red-50 rounded-lg">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                <button onClick={() => go('/signin')} className="text-left px-3 py-2.5 text-sm font-medium text-sand-700 hover:bg-brand-50 rounded-lg">
                  Sign in
                </button>
                <button onClick={() => go('/signup')} className="text-left flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-brand-700 rounded-lg">
                  <Compass className="w-4 h-4" /> Get started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { navigate } = useRouter();
  return (
    <footer className="bg-sand-900 text-sand-300 mt-24">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm">
                <img src="/Logo_Host_Abroad_Inc..png" alt="Host Abroad Inc." className="w-full h-full object-cover" />
              </span>
              <span className="font-extrabold text-lg text-white">Host<span className="text-brand-400">Abroad</span><span className="text-sand-300">.ca</span></span>
            </div>
            <p className="text-sm text-sand-400 leading-relaxed max-w-xs">
              Connecting international students with welcoming Canadian host families since 2024.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Students</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/signup')} className="hover:text-brand-400 transition-colors">Create account</button></li>
              <li><button onClick={() => navigate('/#how-it-works')} className="hover:text-brand-400 transition-colors">How it works</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Hosts</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/signup')} className="hover:text-brand-400 transition-colors">Become a host</button></li>
              <li><button onClick={() => navigate('/#hosts')} className="hover:text-brand-400 transition-colors">Why host</button></li>
              <li><button onClick={() => navigate('/dashboard')} className="hover:text-brand-400 transition-colors">Host dashboard</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => navigate('/#faq')} className="hover:text-brand-400 transition-colors">FAQ</button></li>
              <li><a href="mailto:hello@hostabroad.ca" className="hover:text-brand-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-sand-800 flex flex-col md:flex-row justify-between gap-4 text-xs text-sand-500">
          <p>&copy; {new Date().getFullYear()} HostAbroad.ca — Made in Canada.</p>
          <p>Every host is identity-verified. Payments secured by Stripe.</p>
        </div>
      </div>
    </footer>
  );
}
