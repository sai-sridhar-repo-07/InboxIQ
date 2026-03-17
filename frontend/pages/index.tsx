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

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.svg" alt="Mailair" className="h-8 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="btn-primary text-sm">Start Free</Link>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <a href="#features" className="block text-sm text-gray-600" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm text-gray-600" onClick={() => setMobileOpen(false)}>How It Works</a>
          <a href="#pricing" className="block text-sm text-gray-600" onClick={() => setMobileOpen(false)}>Pricing</a>
          <Link href="/auth/signin" className="block text-sm text-gray-600">Sign In</Link>
          <Link href="/auth/signup" className="btn-primary text-sm w-full justify-center">Start Free</Link>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-primary-50/30 to-white">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-100 px-4 py-1.5">
            <Zap className="h-3.5 w-3.5 text-primary-600" />
            <span className="text-xs font-semibold text-primary-700">AI-powered email triage for service businesses</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-none">
            Your AI-Powered
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-blue-500 bg-clip-text text-transparent">
              Email Command Center
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-600 leading-relaxed">
            Mailair reads, categorizes, and prioritizes every email for your service business.
            Never miss an urgent client message, auto-draft replies, and extract action items — all with AI.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="btn-primary text-base px-8 py-3 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
            >
              Start Free — No Credit Card
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="btn-secondary text-base px-8 py-3"
            >
              View Demo
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-400">Free for up to 100 emails/month · Setup in 2 minutes</p>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-16 relative mx-auto max-w-5xl">
          <div className="rounded-2xl shadow-2xl shadow-gray-900/20 border border-gray-200 overflow-hidden bg-white">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-3 border-b border-gray-200">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-3 flex-1 rounded-md bg-white border border-gray-200 px-3 py-1 text-xs text-gray-400">
                mailair.company/dashboard
              </div>
            </div>
            {/* Dashboard content mockup */}
            <div className="flex h-80 sm:h-96">
              {/* Sidebar */}
              <div className="w-14 sm:w-52 bg-white border-r border-gray-100 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-md bg-primary-600 flex-shrink-0" />
                  <span className="hidden sm:block text-xs font-bold text-gray-900">Thread<span className="text-primary-600">ly</span></span>
                </div>
                {['Dashboard','Inbox','Actions','Settings'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 ${i === 0 ? 'bg-primary-50' : ''}`}
                  >
                    <div className={`h-4 w-4 rounded flex-shrink-0 ${i === 0 ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    <span className={`hidden sm:block text-xs ${i === 0 ? 'text-primary-700 font-semibold' : 'text-gray-500'}`}>{item}</span>
                  </div>
                ))}
              </div>
              {/* Main content */}
              <div className="flex-1 p-4 bg-gray-50 overflow-hidden">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Total Emails', val: '247', color: 'bg-blue-500' },
                    { label: 'Urgent', val: '8', color: 'bg-red-500' },
                    { label: 'Need Reply', val: '23', color: 'bg-amber-500' },
                    { label: 'Actions', val: '41', color: 'bg-green-500' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                      <div className={`h-2 w-6 rounded-full ${s.color} mb-2`} />
                      <div className="text-lg font-bold text-gray-900">{s.val}</div>
                      <div className="text-xs text-gray-400 hidden sm:block">{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Email list */}
                <div className="space-y-2">
                  {[
                    { from: 'Sarah M.', subject: 'Urgent: Contract needs signature today', cat: 'URGENT', catColor: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
                    { from: 'Tech Corp', subject: 'Invoice #2847 — payment overdue', cat: 'RESPONSE', catColor: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
                    { from: 'Mike R.', subject: 'Following up on last week\'s proposal', cat: 'FOLLOW UP', catColor: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
                  ].map((email) => (
                    <div key={email.subject} className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${email.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{email.from}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${email.catColor}`}>{email.cat}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{email.subject}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-primary-100 to-blue-100 opacity-60 blur-3xl rounded-3xl" />
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
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: CheckCircle,
    title: 'Action Item Extraction',
    description: 'AI scans every email and pulls out tasks, deadlines, and follow-ups into a clean action list you can check off as you go.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: MessageSquare,
    title: 'Smart Reply Drafts',
    description: 'Get AI-crafted reply drafts tailored to your tone and business context. Edit and send in seconds — or let them go out automatically.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Inbox,
    title: 'Priority Inbox',
    description: 'A curated view that surfaces your most important emails first, so you spend less time triaging and more time doing great work.',
    color: 'text-primary-600',
    bg: 'bg-primary-50',
  },
  {
    icon: Bell,
    title: 'Slack Notifications',
    description: 'Get instant Slack alerts when urgent emails land in your inbox. Stay informed without living in your email client.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Zap,
    title: 'AI That Learns You',
    description: 'The more you use Mailair, the smarter it gets. It learns your preferences, business context, and communication style over time.',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900">Everything you need to master your inbox</h2>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Purpose-built for freelancers, agencies, and service businesses who can't afford to miss critical client emails.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const { icon: Icon } = feature;
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}>
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
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
      title: 'AI reads and categorizes',
      description: 'Our AI engine reads every incoming email, categorizes it, extracts action items, scores priority, and drafts a reply — in seconds.',
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
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900">Set up in minutes, save hours every week</h2>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Three simple steps to transform how you handle email.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection lines */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary-200 to-purple-200 z-0" />
          {steps.map((step, i) => {
            const { icon: Icon } = step;
            return (
              <div key={step.step} className="relative text-center">
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ${step.color} shadow-lg`}>
                  <Icon className="h-9 w-9 text-white" />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white border-2 border-gray-200 text-xs font-bold text-gray-500 shadow-sm">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{step.description}</p>
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
    period: '/month',
    description: 'Perfect for individuals just getting started.',
    features: [
      '100 emails/month',
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
    price: 29,
    period: '/month',
    description: 'For growing service businesses.',
    features: [
      'Unlimited emails',
      '5 Gmail accounts',
      'Advanced AI models',
      'Smart reply drafts',
      'Slack notifications',
      'Priority support',
    ],
    cta: 'Start Pro Free Trial',
    href: '/auth/signup?plan=pro',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 79,
    period: '/month',
    description: 'For agencies and teams.',
    features: [
      'Everything in Pro',
      'Unlimited Gmail accounts',
      'Team member access',
      'Custom AI training',
      'API access',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    href: '/auth/signup?plan=agency',
    highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade when you're ready. No hidden fees.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-8 ${
                plan.highlight
                  ? 'border-primary-500 bg-primary-600 shadow-2xl shadow-primary-500/25 scale-105'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900 shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}
              <h3 className={`text-xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <p className={`mt-1 text-sm ${plan.highlight ? 'text-primary-200' : 'text-gray-500'}`}>
                {plan.description}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className={`text-5xl font-extrabold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  ${plan.price}
                </span>
                <span className={`text-sm ${plan.highlight ? 'text-primary-200' : 'text-gray-500'}`}>
                  {plan.period}
                </span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <CheckCircle
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        plan.highlight ? 'text-primary-200' : 'text-green-500'
                      }`}
                    />
                    <span
                      className={`text-sm ${plan.highlight ? 'text-primary-100' : 'text-gray-600'}`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlight
                    ? 'bg-white text-primary-600 hover:bg-primary-50 shadow-lg'
                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.cta}
              </Link>
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
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900">Loved by service business owners</h2>
          <p className="mt-4 text-xl text-gray-600">Join hundreds of businesses saving time with Mailair.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="card p-6">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.avatarColor} text-white text-sm font-bold`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
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
function CTABanner() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 to-primary-700">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-4 flex justify-center">
          <Shield className="h-12 w-12 text-primary-200" />
        </div>
        <h2 className="text-4xl font-bold text-white">Start for free today</h2>
        <p className="mt-4 text-xl text-primary-200 max-w-2xl mx-auto">
          No credit card required. Connect your Gmail in 2 minutes and let AI take control of your inbox chaos.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary-600 shadow-lg hover:bg-primary-50 transition-colors"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 text-primary-200 text-sm">
            <Clock className="h-4 w-4" />
            Setup takes less than 2 minutes
          </div>
        </div>
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
              <img src="/logo-dark.svg" alt="Mailair" className="h-8 w-auto" />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              AI-powered email management for service businesses. Triage, prioritize, and respond — faster than ever.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              {['Features', 'Pricing', 'Integrations', 'Changelog'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              {['Docs', 'Blog', 'Support', 'Status'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2024 Mailair. All rights reserved.</p>
          <p className="text-sm text-gray-500">Made with care for service businesses everywhere.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Mailair — AI-Powered Email Command Center</title>
        <meta name="description" content="Mailair uses AI to triage, prioritize, and draft replies for your business emails. Built for service businesses." />
        <meta property="og:title" content="Mailair — AI Email Command Center" />
        <meta property="og:description" content="Stop drowning in email. Let AI triage, prioritize, and draft replies for your service business." />
      </Head>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
