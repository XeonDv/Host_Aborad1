import { useState } from 'react';
import { ArrowRight, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Button, ErrorBanner, Spinner } from '@/components/ui';

export function SignInPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-5 py-12 hero-gradient">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-sand-200 p-7 sm:p-9 opacity-0-init animate-fade-up">
          <h1 className="text-2xl font-extrabold text-sand-900 tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-sand-600">Sign in to manage your homestays and bookings.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-xs font-semibold text-sand-700 mb-1.5">Email</span>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-sand-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
              </div>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-sand-700 mb-1.5">Password</span>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-sand-400" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                />
              </div>
            </label>

            {error && <ErrorBanner message={error} />}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Spinner /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-sand-600">
            New to HostAbroad?{' '}
            <button onClick={() => navigate('/signup')} className="font-semibold text-brand-700 hover:underline">
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
