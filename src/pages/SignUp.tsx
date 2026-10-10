import { useState } from 'react';
import { GraduationCap, Home as HomeIcon, ArrowRight, ArrowLeft, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { Button, ErrorBanner, Spinner } from '@/components/ui';
import type { UserType } from '@/lib/types';

export function SignUpPage() {
  const { signUp } = useAuth();
  const { navigate } = useRouter();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [userType, setUserType] = useState<UserType | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password, userType, fullName);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    // Students go to registration fee page; hosts go to dashboard
    navigate(userType === 'student' ? '/register' : '/dashboard');
  };

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-5 py-12 hero-gradient">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-sand-200 p-7 sm:p-9">
          {step === 'role' ? (
            <div className="opacity-0-init animate-fade-up">
              <h1 className="text-2xl font-extrabold text-sand-900 tracking-tight">Create your account</h1>
              <p className="mt-2 text-sm text-sand-600">I'm joining HostAbroad as a...</p>
              <div className="mt-6 space-y-3">
                <RoleCard
                  selected={userType === 'student'}
                  onClick={() => setUserType('student')}
                  icon={<GraduationCap className="w-7 h-7" />}
                  title="Student"
                  desc="I'm looking for a homestay in Canada"
                />
                <RoleCard
                  selected={userType === 'host'}
                  onClick={() => setUserType('host')}
                  icon={<HomeIcon className="w-7 h-7" />}
                  title="Host"
                  desc="I have a room to offer international students"
                />
              </div>
              <Button
                className="w-full mt-6"
                size="lg"
                disabled={!userType}
                onClick={() => setStep('details')}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="mt-5 text-center text-sm text-sand-600">
                Already have an account?{' '}
                <button onClick={() => navigate('/signin')} className="font-semibold text-brand-700 hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="opacity-0-init animate-fade-up">
              <button
                type="button"
                onClick={() => setStep('role')}
                className="flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-800 mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-extrabold text-sand-900 tracking-tight">
                {userType === 'student' ? 'Student sign up' : 'Host sign up'}
              </h1>
              <p className="mt-2 text-sm text-sand-600">Tell us a bit about yourself to get started.</p>

              <div className="mt-6 space-y-4">
                <Field label="Full name">
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-sand-400" />
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  </div>
                </Field>
                <Field label="Email">
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
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-sand-400" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                    />
                  </div>
                </Field>
              </div>

              {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

              <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
                {loading ? <Spinner /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
              </Button>
              <p className="mt-5 text-center text-xs text-sand-500">
                By signing up you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleCard({ selected, onClick, icon, title, desc }: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
        selected
          ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-200'
          : 'border-sand-200 hover:border-sand-300 bg-white'
      }`}
    >
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-brand-700 text-white' : 'bg-sand-100 text-sand-700'}`}>
        {icon}
      </span>
      <div className="flex-1">
        <p className="font-bold text-sand-900">{title}</p>
        <p className="text-xs text-sand-500 mt-0.5">{desc}</p>
      </div>
      <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${selected ? 'border-brand-600 bg-brand-600' : 'border-sand-300'}`} />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-sand-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
