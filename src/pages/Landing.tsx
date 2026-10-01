import { useState } from 'react';
import {
  ShieldCheck, HeartHandshake, MapPin, Star, ArrowRight,
  Wifi, UtensilsCrossed, BookOpen, GraduationCap, Home as HomeIcon,
  Plane, MessageCircle, CheckCircle2, ChevronDown, Sparkles, Globe2,
  Compass,
} from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Badge, Button, Section } from '@/components/ui';

const HERO_IMG = 'https://images.pexels.com/photos/8054841/pexels-photo-8054841.jpeg?auto=compress&cs=tinysrgb&h=900&w=1400';
const SECONDARY_IMG = 'https://images.pexels.com/photos/7147299/pexels-photo-7147299.jpeg?auto=compress&cs=tinysrgb&h=700&w=900';

const CITIES = [
  { name: 'Toronto', desc: 'Canada\'s largest city — universities, culture, opportunity.', img: 'https://images.pexels.com/photos/16669433/pexels-photo-16669433.jpeg?auto=compress&cs=tinysrgb&h=600&w=800' },
  { name: 'Vancouver', desc: 'Ocean and mountains — a Pacific gateway for students.', img: 'https://images.pexels.com/photos/18802091/pexels-photo-18802091.jpeg?auto=compress&cs=tinysrgb&h=600&w=800' },
  { name: 'Montreal', desc: 'Bilingual, affordable, and full of arts and festivals.', img: 'https://images.pexels.com/photos/25696388/pexels-photo-25696388.jpeg?auto=compress&cs=tinysrgb&h=600&w=800' },
  { name: 'Calgary', desc: 'Rocky Mountain energy with a welcoming community.', img: 'https://images.pexels.com/photos/11819107/pexels-photo-11819107.jpeg?auto=compress&cs=tinysrgb&h=600&w=800' },
];

const STEPS_STUDENT = [
  { icon: Compass, title: 'Create your profile', text: 'Sign up and tell us your destination, budget, and preferences. It takes two minutes.' },
  { icon: ShieldCheck, title: 'Pay the registration fee', text: 'A one-time fee unlocks full access to every verified homestay across Canada.' },
  { icon: MessageCircle, title: 'Browse and connect', text: 'Filter by city, budget, and amenities. Message hosts directly to find your match.' },
  { icon: Plane, title: 'Book and arrive', text: 'Pay your accommodation securely online and arrive in Canada with a home waiting.' },
];

const STEPS_HOST = [
  { icon: HomeIcon, title: 'List your spare room', text: 'Create a listing in minutes with photos, price, and house rules.' },
  { icon: GraduationCap, title: 'Receive booking requests', text: 'Students from around the world find your listing and request a stay.' },
  { icon: HeartHandshake, title: 'Welcome your student', text: 'Approve requests, chat with students, and welcome them to Canada.' },
  { icon: Sparkles, title: 'Earn monthly income', text: 'Get paid reliably each month while sharing your home and culture.' },
];

const AMENITIES = [
  { icon: Wifi, label: 'Wi-Fi' },
  { icon: UtensilsCrossed, label: 'Meals included' },
  { icon: BookOpen, label: 'Study desk' },
  { icon: ShieldCheck, label: 'Verified hosts' },
];

const TESTIMONIALS = [
  {
    quote: 'I arrived in Toronto from Seoul not knowing anyone. My host family helped me open a bank account and practice English every dinner. I felt at home within a week.',
    name: 'Jiwoo K.',
    role: 'Student from South Korea',
    img: 'https://images.pexels.com/photos/8055130/pexels-photo-8055130.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
  },
  {
    quote: 'Hosting international students has enriched our family. We\'ve learned about five cultures and our kids love it. The extra income pays our mortgage.',
    name: 'The Patels',
    role: 'Host family in Vancouver',
    img: 'https://images.pexels.com/photos/39219601/pexels-photo-39219601.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
  },
  {
    quote: 'Booking through HostAbroad was so much easier than Facebook groups. Verified photos, clear pricing, and I paid online before I landed. No surprises.',
    name: 'Lucas M.',
    role: 'Student from Brazil',
    img: 'https://images.pexels.com/photos/38395596/pexels-photo-38395596.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
  },
];

const FAQS = [
  {
    q: 'How do I know a host is safe and verified?',
    a: 'Every host on HostAbroad completes identity verification before their listing goes live. We check government ID and conduct background screening. Look for the verified badge on every listing.',
  },
  {
    q: 'Why is there a registration fee?',
    a: 'The one-time registration fee covers identity verification, profile matching, and platform access. It ensures that only serious students connect with our verified hosts, keeping the community safe and high-quality.',
  },
  {
    q: 'What\'s included in the monthly price?',
    a: 'Each listing clearly states what\'s included — typically a furnished room, Wi-Fi, and utilities. Many hosts also include meals. You\'ll see the full breakdown and the total before you pay, with no hidden fees.',
  },
  {
    q: 'Can I book before I arrive in Canada?',
    a: 'Yes — that\'s the whole point. After paying the registration fee, browse listings, connect with hosts, and reserve your room online with secure payment. Your host will coordinate your arrival day with you.',
  },
  {
    q: 'How does payment work?',
    a: 'You pay securely online through Stripe, the same processor used by major retailers. Your payment is held safely and released to your host according to your booking schedule.',
  },
  {
    q: 'How much can I earn as a host?',
    a: 'Hosts in Toronto and Vancouver typically earn $900–$1,500 CAD per room per month. You set your own price, availability, and house rules. There are no upfront costs to list.',
  },
];

export function LandingPage() {
  const { navigate } = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="pt-16">
      {/* HERO */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="opacity-0-init animate-fade-up">
              <Badge className="mb-5">
                <Globe2 className="w-3.5 h-3.5" /> Trusted by students from 40+ countries
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-sand-900 leading-[1.1]">
                Your home away<br />from home in <span className="text-brand-700">Canada</span>.
              </h1>
              <p className="mt-6 text-lg text-sand-600 max-w-xl leading-relaxed">
                HostAbroad connects international students with verified, welcoming host families.
                Create your profile, pay a one-time registration fee, and unlock homestays across Canada.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate('/signup')}>
                  <GraduationCap className="w-5 h-5" /> Find your homestay
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/signup')}>
                  Become a host <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-sand-600">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-600" /> ID-verified hosts</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-brand-600" /> 4.9 average rating</span>
                <span className="flex items-center gap-1.5"><HeartHandshake className="w-4 h-4 text-brand-600" /> 24/7 support</span>
              </div>
            </div>

            <div className="relative opacity-0-init animate-fade-up animate-delay-200">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-sand-900/5">
                <img
                  src={HERO_IMG}
                  alt="A host family welcoming a student into their home"
                  className="w-full h-[420px] lg:h-[480px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sand-900/40 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -left-4 lg:-left-8 w-48 lg:w-60 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white animate-float">
                <img src={SECONDARY_IMG} alt="A cozy furnished bedroom" className="w-full h-32 lg:h-40 object-cover" />
              </div>
              <div className="absolute -top-4 -right-2 lg:right-6 bg-white rounded-2xl shadow-xl px-4 py-3 ring-1 ring-sand-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-brand-700" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-sand-900">Verified host</p>
                    <p className="text-[11px] text-sand-500">Toronto, ON</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AMENITIES STRIP */}
      <Section className="py-10 -mt-px">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white rounded-2xl border border-sand-200 shadow-sm p-5 lg:p-6">
          {AMENITIES.map((a) => (
            <div key={a.label} className="flex items-center gap-3 px-3 py-2">
              <span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                <a.icon className="w-5 h-5 text-brand-700" />
              </span>
              <span className="text-sm font-semibold text-sand-800">{a.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how-it-works" className="py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge className="mb-4">Simple by design</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-sand-900 tracking-tight">How HostAbroad works</h2>
          <p className="mt-4 text-sand-600 text-lg">Whether you're a student coming to Canada or a family with a spare room, getting started takes minutes.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <div className="bg-white rounded-3xl border border-sand-200 p-7 lg:p-9 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold">S</div>
              <div>
                <h3 className="text-xl font-bold text-sand-900">For students</h3>
                <p className="text-sm text-sand-500">Register and find your homestay</p>
              </div>
            </div>
            <ol className="space-y-5">
              {STEPS_STUDENT.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-brand-700" />
                    </div>
                    {i < STEPS_STUDENT.length - 1 && (
                      <div className="absolute left-1/2 top-10 -translate-x-1/2 w-px h-6 bg-sand-200" />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className="font-semibold text-sand-900 text-sm">{s.title}</p>
                    <p className="text-sm text-sand-600 mt-1 leading-relaxed">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-3xl border border-sand-200 p-7 lg:p-9 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-sand-800 text-white flex items-center justify-center font-bold">H</div>
              <div>
                <h3 className="text-xl font-bold text-sand-900">For hosts</h3>
                <p className="text-sm text-sand-500">List your room and earn</p>
              </div>
            </div>
            <ol className="space-y-5">
              {STEPS_HOST.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-sand-800" />
                    </div>
                    {i < STEPS_HOST.length - 1 && (
                      <div className="absolute left-1/2 top-10 -translate-x-1/2 w-px h-6 bg-sand-200" />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className="font-semibold text-sand-900 text-sm">{s.title}</p>
                    <p className="text-sm text-sand-600 mt-1 leading-relaxed">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* CITIES */}
      <Section id="cities" className="py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4"><MapPin className="w-3.5 h-3.5" /> Across Canada</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-sand-900 tracking-tight">Popular student cities</h2>
          <p className="mt-4 text-sand-600 text-lg">Homestays available in Canada's top destinations for international students.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {CITIES.map((c) => (
            <button
              key={c.name}
              onClick={() => navigate('/signup')}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] shadow-sm hover:shadow-xl transition-all text-left"
            >
              <img src={c.img} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-sand-900/80 via-sand-900/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-4 lg:p-5">
                <h3 className="text-lg font-bold text-white">{c.name}</h3>
                <p className="text-xs text-white/80 mt-1 leading-snug line-clamp-2">{c.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* HOST CTA */}
      <Section id="hosts" className="py-12">
        <div className="relative overflow-hidden rounded-3xl bg-brand-800 text-white px-6 py-14 lg:px-16 lg:py-20 shadow-xl">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3), transparent 50%)' }} />
          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Open your home. Change a life.</h2>
              <p className="mt-4 text-brand-100 text-lg max-w-xl leading-relaxed">
                Join thousands of Canadian families hosting international students. Earn reliable monthly income,
                share your culture, and make a global connection that lasts a lifetime.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Button size="lg" variant="secondary" onClick={() => navigate('/signup')} className="bg-white text-brand-800 hover:bg-brand-50 border-0">
                  Start hosting <ArrowRight className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 text-brand-100 text-sm">
                  <ShieldCheck className="w-5 h-5" /> Free to list &middot; No upfront costs
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              {[
                { stat: '$1,200', label: 'avg. monthly income' },
                { stat: '40+', label: 'countries served' },
                { stat: '4.9★', label: 'host satisfaction' },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center ring-1 ring-white/20">
                  <p className="text-2xl lg:text-3xl font-extrabold">{s.stat}</p>
                  <p className="text-xs text-brand-100 mt-1 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section className="py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge className="mb-4"><HeartHandshake className="w-3.5 h-3.5" /> Real stories</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-sand-900 tracking-tight">Loved by students and hosts</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="bg-white rounded-2xl border border-sand-200 p-6 shadow-sm flex flex-col">
              <div className="flex gap-0.5 text-brand-500 mb-4">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <blockquote className="text-sand-700 leading-relaxed text-sm flex-1">"{t.quote}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <img src={t.img} alt={t.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-brand-100" />
                <div>
                  <p className="font-semibold text-sand-900 text-sm">{t.name}</p>
                  <p className="text-xs text-sand-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="py-20 lg:py-28">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1">
            <Badge className="mb-4">Questions</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-sand-900 tracking-tight">Frequently asked</h2>
            <p className="mt-4 text-sand-600">Everything you need to know about booking and hosting with HostAbroad.</p>
            <Button variant="outline" className="mt-6" onClick={() => navigate('/signup')}>
              Get started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="lg:col-span-2 space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-sand-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-semibold text-sand-900 text-sm">{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-sand-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-sand-600 leading-relaxed">{f.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
