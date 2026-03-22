import Head from 'next/head';
import Link from 'next/link';
import { Mail, Slack, Calendar, Database, Zap, Globe } from 'lucide-react';

const integrations = [
  {
    icon: Mail,
    name: 'Gmail',
    category: 'Email',
    status: 'Available',
    color: 'bg-red-50 text-red-600',
    description: 'Connect your Gmail account to sync, categorize, and AI-process your emails. Supports multiple accounts on Pro and Agency plans.',
  },
  {
    icon: Slack,
    name: 'Slack',
    category: 'Notifications',
    status: 'Available',
    color: 'bg-purple-50 text-purple-600',
    description: 'Get instant Slack notifications when urgent emails arrive. Configure which categories trigger alerts and which channel to post to.',
  },
  {
    icon: Calendar,
    name: 'Google Calendar',
    category: 'Productivity',
    status: 'Available',
    color: 'bg-blue-50 text-blue-600',
    description: 'Mailair detects meeting requests in your emails and lets you add them directly to Google Calendar with one click.',
  },
  {
    icon: Database,
    name: 'HubSpot',
    category: 'CRM',
    status: 'Agency',
    color: 'bg-orange-50 text-orange-600',
    description: 'Sync email conversations and contacts with HubSpot. Store your API key once and Mailair will log important emails as CRM activities.',
  },
  {
    icon: Database,
    name: 'Salesforce',
    category: 'CRM',
    status: 'Agency',
    color: 'bg-sky-50 text-sky-600',
    description: 'Connect Salesforce to automatically log client emails as activities and link them to the right contacts and opportunities.',
  },
  {
    icon: Mail,
    name: 'Outlook / Microsoft 365',
    category: 'Email',
    status: 'Beta',
    color: 'bg-blue-50 text-blue-700',
    description: 'Connect your Microsoft 365 or Outlook account. Currently in beta — reach out if you would like early access.',
  },
  {
    icon: Zap,
    name: 'Zapier',
    category: 'Automation',
    status: 'Coming Soon',
    color: 'bg-amber-50 text-amber-600',
    description: 'Trigger workflows in thousands of apps whenever Mailair categorizes an email as urgent or extracts an action item.',
  },
  {
    icon: Globe,
    name: 'REST API',
    category: 'Developer',
    status: 'Agency',
    color: 'bg-gray-50 text-gray-600',
    description: 'Full API access for Agency plan users. Build custom integrations, pull email stats into your own dashboards, or trigger processing programmatically.',
  },
];

const statusColors: Record<string, string> = {
  Available:    'bg-green-100 text-green-700',
  Agency:       'bg-purple-100 text-purple-700',
  Beta:         'bg-blue-100 text-blue-700',
  'Coming Soon':'bg-gray-100 text-gray-500',
};

export default function IntegrationsPage() {
  return (
    <>
      <Head>
        <title>Integrations — Mailair</title>
        <meta name="description" content="Connect Mailair with Gmail, Slack, HubSpot, Salesforce, Google Calendar, and more." />
      </Head>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
        <Link href="/"><img src="/logo.svg" alt="Mailair" style={{ height: 36 }} /></Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/#pricing" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>Pricing</Link>
          <Link href="/docs" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>Docs</Link>
          <Link href="/auth/signin" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>Sign In</Link>
          <Link href="/auth/signup" style={{ background: '#2563eb', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Start Free</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#111827', margin: 0 }}>Integrations</h1>
          <p style={{ marginTop: 16, fontSize: 18, color: '#6b7280', maxWidth: 540, margin: '16px auto 0' }}>
            Connect Mailair with the tools your business already uses.
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {integrations.map((intg) => {
            const Icon = intg.icon;
            return (
              <div key={intg.name} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={intg.color}>
                    <Icon size={22} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em' }} className={statusColors[intg.status] ?? statusColors.Available}>
                    {intg.status}
                  </span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{intg.category}</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>{intg.name}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{intg.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 80, textAlign: 'center', background: '#eff6ff', borderRadius: 20, padding: '48px 24px', border: '1px solid #bfdbfe' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1e40af', margin: '0 0 12px' }}>Missing an integration?</h2>
          <p style={{ color: '#3b82f6', fontSize: 16, margin: '0 0 28px' }}>Tell us what tools you use and we will prioritize building it.</p>
          <a href="mailto:saisridhart@gmail.com" style={{ background: '#2563eb', color: '#fff', padding: '12px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            Request an Integration
          </a>
        </div>
      </div>
    </>
  );
}
