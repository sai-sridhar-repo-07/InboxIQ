import Head from 'next/head';
import Link from 'next/link';
import {
  Tag,
  CheckCircle,
  MessageSquare,
  Inbox,
  Bell,
  Zap,
  ArrowRight,
  Star,
  Menu,
  X,
  Mail,
  TrendingUp,
  Shield,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { useSessionContext } from '@supabase/auth-helpers-react';

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <img src="/logo-dark.svg" alt="Mailair" className="h-11 w-auto cursor-pointer" />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-slate-300 hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-slate-300 hover:text-white transition-colors">Pricing</a>
            {isLoggedIn ? (
              <Link href="/dashboard" className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-lg shadow-blue-600/25">Go to Dashboard</Link>
            ) : (
              <>
                <Link href="/auth/signin" className="text-sm text-slate-300 hover:text-white transition-colors">Sign In</Link>
                <Link href="/auth/signup" className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-lg shadow-blue-600/25">Get Started Free</Link>
              </>
            )}
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-white/10"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-slate-900/95 px-4 py-4 space-y-3">
          <a href="#features" className="block text-sm text-slate-300" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm text-slate-300" onClick={() => setMobileOpen(false)}>How It Works</a>
          <a href="#pricing" className="block text-sm text-slate-300" onClick={() => setMobileOpen(false)}>Pricing</a>
          {isLoggedIn ? (
            <Link href="/dashboard" className="block text-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/auth/signin" className="block text-sm text-slate-300">Sign In</Link>
              <Link href="/auth/signup" className="block text-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Get Started Free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-slate-950 overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300">AI-powered email triage for service businesses</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            <span className="text-white">Your AI-Powered</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Email Command Center
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-400 leading-relaxed">
            Mailair reads, categorizes, and prioritizes every email for your service business.
            Never miss an urgent client message — auto-draft replies and extract action items, all with AI.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? '/dashboard' : '/auth/signup'}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition-all"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-8 py-3.5 text-base font-semibold text-slate-200 transition-all backdrop-blur-sm"
            >
              See How It Works
            </a>
          </div>
          {!isLoggedIn && <p className="mt-4 text-sm text-slate-500">Free plan available · No credit card required</p>}
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-16 relative mx-auto max-w-5xl">
          {/* Glow behind mockup */}
          <div className="absolute -inset-6 -z-10 bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-cyan-600/20 blur-3xl rounded-3xl" />

          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
            {/* Browser chrome — dark */}
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-3 border-b border-white/10">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-amber-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
              <div className="ml-3 flex-1 rounded-md bg-slate-700/60 border border-white/10 px-3 py-1 text-xs text-slate-400">
                mailair.company/dashboard
              </div>
            </div>

            {/* Dashboard content — dark theme */}
            <div className="flex h-80 sm:h-96 bg-slate-900">
              {/* Sidebar */}
              <div className="w-14 sm:w-52 bg-slate-900 border-r border-white/[0.06] p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="h-6 w-6 rounded-md bg-blue-600 flex-shrink-0" />
                  <span className="hidden sm:block text-xs font-bold text-white">Mail<span className="text-blue-400">air</span></span>
                </div>
                {[
                  { label: 'Dashboard', active: true },
                  { label: 'Inbox', active: false },
                  { label: 'Actions', active: false },
                  { label: 'Settings', active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 ${item.active ? 'bg-blue-600/20 border border-blue-500/30' : ''}`}
                  >
                    <div className={`h-3.5 w-3.5 rounded-sm flex-shrink-0 ${item.active ? 'bg-blue-400' : 'bg-slate-600'}`} />
                    <span className={`hidden sm:block text-xs ${item.active ? 'text-blue-300 font-semibold' : 'text-slate-500'}`}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 bg-slate-900 overflow-hidden">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Total Emails', val: '247', color: 'bg-blue-500', glow: 'shadow-blue-500/20' },
                    { label: 'Urgent', val: '8', color: 'bg-red-500', glow: 'shadow-red-500/20' },
                    { label: 'Need Reply', val: '23', color: 'bg-amber-500', glow: 'shadow-amber-500/20' },
                    { label: 'Actions', val: '41', color: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
                  ].map((s) => (
                    <div key={s.label} className={`bg-slate-800/80 rounded-xl p-3 border border-white/[0.06] shadow-lg ${s.glow}`}>
                      <div className={`h-1.5 w-8 rounded-full ${s.color} mb-2.5 opacity-90`} />
                      <div className="text-xl font-bold text-white">{s.val}</div>
                      <div className="text-xs text-slate-500 hidden sm:block mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Email rows */}
                <div className="space-y-2">
                  {[
                    { from: 'Sarah M.', subject: 'Urgent: Contract needs signature today', cat: 'URGENT', catColor: 'bg-red-500/20 text-red-400 border border-red-500/30', dot: 'bg-red-500' },
                    { from: 'Tech Corp', subject: 'Invoice #2847 — payment overdue', cat: 'RESPONSE', catColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', dot: 'bg-blue-500' },
                    { from: 'Mike R.', subject: "Following up on last week's proposal", cat: 'FOLLOW UP', catColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', dot: 'bg-amber-500' },
                  ].map((email) => (
                    <div key={email.subject} className="bg-slate-800/60 rounded-xl p-3 border border-white/[0.05] flex items-start gap-3 hover:bg-slate-800/90 transition-colors">
                      <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${email.dot} shadow-lg`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">{email.from}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${email.catColor}`}>{email.cat}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{email.subject}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Social proof strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {[
            { val: '2h → 20min', label: 'daily email time' },
            { val: '10×', label: 'faster triage' },
            { val: '99%', label: 'emails categorized' },
          ].map((stat) => (
            <div key={stat.val} className="text-center">
              <div className="text-2xl font-extrabold text-white">{stat.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Tag,
    title: 'AI Email Categorization',
    description: 'Every email is automatically sorted into Urgent, Needs Response, Follow Up, FYI, and more — so you always know what needs attention first.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
  },
  {
    icon: CheckCircle,
    title: 'Action Item Extraction',
    description: 'AI scans every email and pulls out tasks, deadlines, and follow-ups into a clean action list you can check off as you go.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
  },
  {
    icon: MessageSquare,
    title: 'Smart Reply Drafts',
    description: 'Get AI-crafted reply drafts tailored to your tone and business context. Edit and send in seconds — or let them go out automatically.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
  },
  {
    icon: Inbox,
    title: 'Priority Inbox',
    description: 'A curated view that surfaces your most important emails first, so you spend less time triaging and more time doing great work.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
  },
  {
    icon: Bell,
    title: 'Slack Notifications',
    description: 'Get instant Slack alerts when urgent emails land in your inbox. Stay informed without living in your email client.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
  },
  {
    icon: Zap,
    title: 'AI That Learns You',
    description: 'The more you use Mailair, the smarter it gets. It learns your preferences, business context, and communication style over time.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Features</p>
          <h2 className="text-4xl font-bold text-white">Everything you need to master your inbox</h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Purpose-built for freelancers, agencies, and service businesses who can&apos;t afford to miss critical client emails.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const { icon: Icon } = feature;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/[0.07] bg-slate-900/60 p-6 hover:bg-slate-800/60 hover:border-white/15 transition-all"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg}`}>
                  <Icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: Mail,
      title: 'Connect your Gmail',
      description: 'Securely connect your Gmail account with one click using Google OAuth. Mailair never stores your email credentials.',
      color: 'bg-primary-600',
    },
    {
      step: '02',
      icon: Zap,
      title: 'Click to process with AI',
      description: 'Click "Process with AI" on any email. Our AI categorizes it, extracts action items, scores priority, and drafts a reply — in seconds. You stay in control of your usage.',
      color: 'bg-purple-600',
    },
    {
      step: '03',
      icon: TrendingUp,
      title: 'You take action',
      description: 'Review your priority inbox, check off action items, edit and send AI-drafted replies, and get Slack alerts for urgent messages.',
      color: 'bg-green-600',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">How It Works</p>
          <h2 className="text-4xl font-bold text-white">Set up in minutes, save hours every week</h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Three simple steps to transform how you handle email.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-500/40 via-violet-500/40 to-blue-500/40 z-0" />
          {steps.map((step, i) => {
            const { icon: Icon } = step;
            return (
              <div key={step.step} className="relative text-center p-6 rounded-2xl border border-white/[0.07] bg-slate-800/40">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 border border-white/20 text-xs font-bold text-slate-300 shadow-sm z-10">
                  {i + 1}
                </div>
                <div className={`mx-auto mb-5 mt-2 flex h-16 w-16 items-center justify-center rounded-2xl ${step.color} shadow-lg shadow-black/30`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: '',
    period: '/month',
    description: 'Perfect for individuals just getting started.',
    features: [
      '5 AI-processed emails/month',
      '1 Gmail account',
      'Basic AI categorization',
      'Action item extraction',
      'Priority inbox',
    ],
    cta: 'Get Started Free',
    href: '/auth/signup',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 199,
    currency: '₹',
    period: '/month',
    description: 'For growing service businesses.',
    features: [
      'Unlimited AI-processed emails',
      '5 Gmail accounts',
      'Advanced AI models',
      'Smart reply drafts',
      'Slack notifications',
      'Priority support',
    ],
    cta: 'Start Pro',
    href: '/auth/signup',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 1499,
    currency: '₹',
    period: '/month',
    description: 'For agencies and teams.',
    features: [
      'Everything in Pro',
      'Unlimited Gmail accounts',
      'Team member access',
      'CRM integrations (HubSpot, Salesforce)',
      'API access',
      'Dedicated support',
    ],
    cta: 'Start Agency',
    href: '/auth/signup',
    highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Pricing</p>
          <h2 className="text-4xl font-bold text-white">Simple, transparent pricing</h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready. No hidden fees.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.highlight
                  ? 'border border-blue-500/60 bg-gradient-to-b from-blue-600/30 to-violet-600/20 shadow-2xl shadow-blue-500/20 scale-105'
                  : 'border border-white/[0.07] bg-slate-800/40'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900 shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className={`mt-1 text-sm ${plan.highlight ? 'text-blue-300' : 'text-slate-500'}`}>
                {plan.description}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-white">
                  {plan.price === 0 ? 'Free' : `${plan.currency}${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && (
                  <span className={`text-sm ${plan.highlight ? 'text-blue-300' : 'text-slate-500'}`}>
                    {plan.period}
                  </span>
                )}
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <CheckCircle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${plan.highlight ? 'text-blue-400' : 'text-emerald-500'}`} />
                    <span className={`text-sm ${plan.highlight ? 'text-slate-200' : 'text-slate-400'}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-bold transition-all ${
                  plan.highlight
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Founder, Apex Web Studio',
    avatar: 'SC',
    avatarColor: 'from-purple-400 to-purple-600',
    quote: "Mailair has completely changed how I run my agency. I used to spend 2 hours a day in email. Now it's 20 minutes. The AI reply drafts alone are worth every penny.",
    stars: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Freelance Consultant',
    avatar: 'MJ',
    avatarColor: 'from-blue-400 to-blue-600',
    quote: "I was skeptical about AI email tools but Mailair blew me away. It caught an urgent client message I would have missed during a busy week. That single email saved a $15k contract.",
    stars: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Owner, Sharma Design Co.',
    avatar: 'PS',
    avatarColor: 'from-pink-400 to-pink-600',
    quote: "As a solo designer juggling 20+ clients, the priority inbox feature is a lifesaver. I finally feel in control of my inbox instead of drowning in it.",
    stars: 5,
  },
];

function Testimonials() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Testimonials</p>
          <h2 className="text-4xl font-bold text-white">Loved by service business owners</h2>
          <p className="mt-4 text-lg text-slate-400">Join hundreds of businesses saving time with Mailair.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-white/[0.07] bg-slate-900/60 p-6 flex flex-col">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6 flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${t.avatarColor} text-white text-xs font-bold`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section id="cta" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[400px] bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
      </div>
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />

      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-300 backdrop-blur-sm">
          <Zap className="h-4 w-4 text-blue-400" />
          Free plan available — no credit card required
        </div>
        <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold text-white leading-tight">
          Start managing email<br />with AI today
        </h2>
        <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
          Connect your Gmail, let AI triage your inbox, and never miss a critical client message again.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={isLoggedIn ? '/dashboard' : '/auth/signup'}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition-all"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="h-5 w-5" />
          </Link>
          {!isLoggedIn && (
            <Link
              href="/auth/signin"
              className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-8 py-3.5 text-base font-semibold text-slate-200 transition-all backdrop-blur-sm"
            >
              Sign In
            </Link>
          )}
        </div>
        {!isLoggedIn && <p className="mt-6 text-slate-500 text-sm">5 AI-processed emails free every month. Upgrade anytime.</p>}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gray-900 py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center mb-4">
              <Link href="/"><img src="/logo-dark.svg" alt="Mailair" className="h-11 w-auto cursor-pointer" /></Link>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              AI-powered email management for service businesses. Triage, prioritize, and respond — faster than ever.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/integrations" className="text-sm text-gray-400 hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/changelog" className="text-sm text-gray-400 hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><Link href="/docs" className="text-sm text-gray-400 hover:text-white transition-colors">Docs</Link></li>
              <li><Link href="/support" className="text-sm text-gray-400 hover:text-white transition-colors">Support</Link></li>
              <li><Link href="/status" className="text-sm text-gray-400 hover:text-white transition-colors">Status</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies" className="text-sm text-gray-400 hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link href="/gdpr" className="text-sm text-gray-400 hover:text-white transition-colors">GDPR</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2025 Mailair. All rights reserved.</p>
          <p className="text-sm text-gray-500">Made with care for service businesses everywhere.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { session } = useSessionContext();
  const isLoggedIn = !!session;

  return (
    <>
      <Head>
        <title>Mailair — AI-Powered Email Command Center</title>
        <meta name="description" content="Mailair uses AI to triage, prioritize, and draft replies for your business emails. Built for service businesses." />
        <meta property="og:title" content="Mailair — AI Email Command Center" />
        <meta property="og:description" content="Stop drowning in email. Let AI triage, prioritize, and draft replies for your service business." />
      </Head>
      <Navbar isLoggedIn={isLoggedIn} />
      <main>
        <Hero isLoggedIn={isLoggedIn} />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CTABanner isLoggedIn={isLoggedIn} />
      </main>
      <Footer />
    </>
  );
}
