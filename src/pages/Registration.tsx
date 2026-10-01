import { useState } from 'react';
import {
  CheckCircle2, CreditCard, Lock, ShieldCheck, Sparkles, Search,
  MessageCircle, Plane, ArrowRight, GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Button, ErrorBanner, Spinner } from '@/components/ui';
import { formatCAD } from '@/lib/format';

const REGISTRATION_FEE = 95;

const WHATS_INCLUDED = [
  { icon: Search, title: 'Full homestay access', text: 'Browse every verified listing across Canada with photos, prices, and host details.' },
  { icon: MessageCircle, title: 'Direct host contact', text: 'Message hosts directly to ask questions and confirm availability before you book.' },
  { icon: ShieldCheck, title: 'Verified hosts only', text: 'Every host is identity-verified. We check government ID so you can book with confidence.' },
  { icon: Sparkles, title: 'Profile matching', text: 'We match your profile — destination, budget, dietary needs — to the right homestays.' },
];

const STEPS = [
  { icon: GraduationCap, label: 'Create your profile', done: true },
  { icon: CreditCard, label: 'Pay registration fee', done: false, active: true },
  { icon: Search, label: 'Browse & book homestay', done: false },
];

export function RegistrationPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !profile) {
    navigate('/signin');
    return null;
  }

  // Hosts don't pay a registration fee — send them to dashboard
  if (profile.user_type === 'host') {
    navigate('/dashboard');
    return null;
  }

  // Already paid — go browse
  if (profile.registration_paid) {
    navigate('/listings');
    return null;
  }

  const handlePay = async () => {
    setError(null);
    setPaying(true);
    // NOTE: Real Stripe Checkout integration will replace this once Stripe is configured.
    // For now we mark the fee as paid so the student can proceed through the full flow.
    const { error } = await supabase
      .from('profiles')
      .update({
        registration_paid: true,
        registration_fee_paid_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setPaying(false);
    if (error) {
      setError('Something went wrong recording your payment. Please try again.');
      return;
    }
    await refreshProfile();
    navigate('/listings');
  };

  return (
    <div className="pt-16 min-h-screen hero-gradient">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-12 lg:py-16">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                  s.done ? 'bg-brand-700 text-white' :
                  s.active ? 'bg-brand-700 text-white ring-4 ring-brand-200' :
                  'bg-sand-200 text-sand-400'
                }`}>
                  {s.done ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-semibold text-center max-w-[80px] ${s.active || s.done ? 'text-sand-900' : 'text-sand-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-6 sm:w-10 ${s.done ? 'bg-brand-600' : 'bg-sand-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-sand-200 overflow-hidden opacity-0-init animate-fade-up">
          {/* Header */}
          <div className="bg-brand-800 text-white px-6 sm:px-8 py-8">
            <div className="flex items-center gap-2 text-brand-200 text-sm font-semibold mb-2">
              <Lock className="w-4 h-4" /> One-time registration fee
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {profile.full_name.split(' ')[0]}!</h1>
            <p className="mt-2 text-brand-100 leading-relaxed">
              Your profile is created. Pay the one-time registration fee to unlock full access to verified homestays across Canada.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">
            {/* Fee card */}
            <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/40 p-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-sand-600">Registration fee (one-time)</p>
                <p className="text-3xl font-extrabold text-sand-900 mt-1">{formatCAD(REGISTRATION_FEE)}</p>
                <p className="text-xs text-sand-500 mt-1">Unlocks full browsing and booking access. Non-refundable.</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-brand-700 text-white flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-7 h-7" />
              </div>
            </div>

            {/* What's included */}
            <div className="mt-7">
              <h2 className="text-sm font-bold text-sand-900 uppercase tracking-wide mb-4">What you get</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {WHATS_INCLUDED.map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-sand-50 border border-sand-100">
                    <span className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4.5 h-4.5 text-brand-700" />
                    </span>
                    <div>
                      <p className="font-semibold text-sand-900 text-sm">{item.title}</p>
                      <p className="text-xs text-sand-600 mt-0.5 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-sand-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-600" /> Secure payment</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-brand-600" /> 256-bit encryption</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-brand-600" /> No hidden fees</span>
            </div>

            {error && <div className="mt-5"><ErrorBanner message={error} /></div>}

            {/* Pay button */}
            <Button size="lg" className="w-full mt-6" onClick={handlePay} disabled={paying}>
              {paying ? <Spinner /> : <><CreditCard className="w-5 h-5" /> Pay {formatCAD(REGISTRATION_FEE)} and unlock access</>}
            </Button>

            <p className="mt-4 text-center text-xs text-sand-500">
              You'll be redirected to our secure payment page. After payment, you can immediately browse and book homestays.
            </p>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-sand-400">
              <Plane className="w-3.5 h-3.5" /> Ready to find your home in Canada? <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
