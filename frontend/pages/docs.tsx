import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Mail, Zap, CreditCard, Settings, Users, Shield } from 'lucide-react';

const sections = [
  {
    icon: Mail,
    title: 'Getting Started',
    color: '#2563eb',
    articles: [
      { title: 'Creating your account', anchor: 'create-account' },
      { title: 'Connecting your Gmail', anchor: 'connect-gmail' },
      { title: 'Understanding the dashboard', anchor: 'dashboard' },
      { title: 'Processing your first email', anchor: 'first-email' },
    ],
  },
  {
    icon: Zap,
    title: 'AI Features',
    color: '#7c3aed',
    articles: [
      { title: 'How AI categorization works', anchor: 'categorization' },
      { title: 'Priority scoring explained', anchor: 'priority' },
      { title: 'Action item extraction', anchor: 'actions' },
      { title: 'Smart reply drafts', anchor: 'replies' },
    ],
  },
  {
    icon: CreditCard,
    title: 'Billing & Plans',
    color: '#059669',
    articles: [
      { title: 'Free plan limits (5 emails/month)', anchor: 'free-plan' },
      { title: 'Upgrading to Pro or Agency', anchor: 'upgrade' },
      { title: 'How email usage is counted', anchor: 'usage-count' },
      { title: 'Cancelling your subscription', anchor: 'cancel' },
    ],
  },
  {
    icon: Settings,
    title: 'Integrations',
    color: '#d97706',
    articles: [
      { title: 'Setting up Slack notifications', anchor: 'slack' },
      { title: 'Google Calendar integration', anchor: 'calendar' },
      { title: 'HubSpot CRM setup', anchor: 'hubspot' },
      { title: 'Salesforce CRM setup', anchor: 'salesforce' },
    ],
  },
  {
    icon: Users,
    title: 'Team Features',
    color: '#db2777',
    articles: [
      { title: 'Creating an organization', anchor: 'org' },
      { title: 'Inviting team members', anchor: 'invite' },
      { title: 'Assigning emails to teammates', anchor: 'assign' },
      { title: 'Internal notes on emails', anchor: 'notes' },
    ],
  },
  {
    icon: Shield,
    title: 'Security & Privacy',
    color: '#0891b2',
    articles: [
      { title: 'How we protect your data', anchor: 'data-protection' },
      { title: 'Gmail permissions explained', anchor: 'gmail-permissions' },
      { title: 'Revoking Gmail access', anchor: 'revoke' },
      { title: 'GDPR and your rights', anchor: 'gdpr' },
    ],
  },
];

const content: Record<string, { title: string; body: React.ReactNode }> = {
  'create-account': {
    title: 'Creating your account',
    body: (
      <>
        <p>Go to <a href="https://mailair.company/auth/signup" style={{ color: '#2563eb' }}>mailair.company/auth/signup</a> and click <strong>Continue with Google</strong> to sign up instantly using your Google account — no password required.</p>
        <p style={{ marginTop: 16 }}>Alternatively, enter your email and choose a password to create an email/password account.</p>
        <p style={{ marginTop: 16 }}>Once signed in, you will be taken to the dashboard where you can connect your Gmail account to start processing emails.</p>
      </>
    ),
  },
  'connect-gmail': {
    title: 'Connecting your Gmail',
    body: (
      <>
        <p>Go to <strong>Settings → Gmail</strong> and click <strong>Connect Gmail Account</strong>. You will be redirected to Google's OAuth consent screen.</p>
        <p style={{ marginTop: 16 }}>Mailair requests two Gmail permissions:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}><strong>Read access</strong> — to fetch and process your emails</li>
          <li style={{ marginBottom: 6 }}><strong>Send access</strong> — to send replies on your behalf when you choose to</li>
        </ul>
        <p style={{ marginTop: 16 }}>After connecting, click <strong>Sync</strong> in the Inbox to fetch your latest emails.</p>
      </>
    ),
  },
  'dashboard': {
    title: 'Understanding the dashboard',
    body: (
      <>
        <p>The dashboard shows a snapshot of your inbox health:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}><strong>Total Emails</strong> — all emails synced from Gmail</li>
          <li style={{ marginBottom: 6 }}><strong>Urgent</strong> — emails AI scored as high-priority</li>
          <li style={{ marginBottom: 6 }}><strong>Need Response</strong> — emails awaiting your reply</li>
          <li style={{ marginBottom: 6 }}><strong>Action Items</strong> — tasks extracted from emails</li>
          <li style={{ marginBottom: 6 }}><strong>Priority Inbox</strong> — curated view of most important emails</li>
        </ul>
      </>
    ),
  },
  'first-email': {
    title: 'Processing your first email',
    body: (
      <>
        <p>After syncing emails, you will see them listed in the Inbox. Unprocessed emails show a <strong>"Process with AI"</strong> button.</p>
        <p style={{ marginTop: 16 }}>Click it on any email to:</p>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Categorize the email (Urgent, Needs Response, Follow Up, etc.)</li>
          <li style={{ marginBottom: 6 }}>Score its priority (High / Medium / Low)</li>
          <li style={{ marginBottom: 6 }}>Extract action items</li>
          <li style={{ marginBottom: 6 }}>Generate an AI reply draft</li>
        </ul>
        <p style={{ marginTop: 16 }}>On the Free plan, you can process up to <strong>5 emails per month</strong>. Processed emails count resets on the 1st of each month.</p>
      </>
    ),
  },
  'free-plan': {
    title: 'Free plan limits',
    body: (
      <>
        <p>The Free plan allows you to <strong>AI-process up to 5 emails per month</strong>. Syncing emails to your inbox does not count toward this limit — only clicking "Process with AI" does.</p>
        <p style={{ marginTop: 16 }}>Your usage counter resets on the 1st of every month. You can see your current usage on the <a href="/billing" style={{ color: '#2563eb' }}>Billing page</a>.</p>
        <p style={{ marginTop: 16 }}>When you reach 5/5, the "Process with AI" button will show a prompt to upgrade to Pro for unlimited processing.</p>
      </>
    ),
  },
  'upgrade': {
    title: 'Upgrading to Pro or Agency',
    body: (
      <>
        <p>Go to <a href="/billing" style={{ color: '#2563eb' }}>Settings → Billing</a> and click <strong>Upgrade to Pro</strong> or <strong>Upgrade to Agency</strong>.</p>
        <p style={{ marginTop: 16 }}>You will be redirected to Razorpay's hosted payment page. After completing payment, your plan will activate within seconds via webhook.</p>
        <ul style={{ marginTop: 16, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}><strong>Pro — ₹199/month:</strong> Unlimited AI processing, 5 Gmail accounts, smart replies, Slack notifications</li>
          <li style={{ marginBottom: 6 }}><strong>Agency — ₹1,499/month:</strong> Everything in Pro + unlimited Gmail accounts, team features, CRM integrations, API access</li>
        </ul>
      </>
    ),
  },
  'cancel': {
    title: 'Cancelling your subscription',
    body: (
      <>
        <p>Go to <a href="/billing" style={{ color: '#2563eb' }}>Billing</a> and click <strong>Cancel Subscription</strong>. Your access will continue until the end of your current billing period — no partial refunds are issued.</p>
        <p style={{ marginTop: 16 }}>After cancellation, your account reverts to the Free plan at the end of the period.</p>
      </>
    ),
  },
  'slack': {
    title: 'Setting up Slack notifications',
    body: (
      <>
        <p>Go to <strong>Settings → Notifications</strong> and paste your Slack Incoming Webhook URL.</p>
        <p style={{ marginTop: 16 }}>To get a webhook URL:</p>
        <ol style={{ marginTop: 8, paddingLeft: 20 }}>
          <li style={{ marginBottom: 6 }}>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>api.slack.com/apps</a></li>
          <li style={{ marginBottom: 6 }}>Create a new app → Incoming Webhooks → Activate → Add New Webhook to Workspace</li>
          <li style={{ marginBottom: 6 }}>Select a channel and copy the webhook URL</li>
          <li style={{ marginBottom: 6 }}>Paste it into Mailair Settings</li>
        </ol>
        <p style={{ marginTop: 16 }}>Mailair will send a Slack message whenever an email is categorized as <strong>Urgent</strong>.</p>
      </>
    ),
  },
};

export default function DocsPage() {
  const [active, setActive] = useState('create-account');
  const activeContent = content[active];

  return (
    <>
      <Head>
        <title>Documentation — Mailair</title>
        <meta name="description" content="Mailair documentation — learn how to use AI email management, connect Gmail, set up integrations, and manage your team." />
      </Head>

      <nav style={{ borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/"><img src="/logo.svg" alt="Mailair" style={{ height: 36 }} /></Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/changelog" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>Changelog</Link>
          <Link href="/support" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>Support</Link>
          <Link href="/auth/signin" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none' }}>Sign In</Link>
        </div>
      </nav>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <aside style={{ width: 260, flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: '32px 16px', overflowY: 'auto', position: 'sticky', top: 64, height: 'calc(100vh - 64px)', background: '#fafafa' }}>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon size={14} color={section.color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{section.title}</span>
                </div>
                {section.articles.map((article) => (
                  <button
                    key={article.anchor}
                    onClick={() => setActive(article.anchor)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: active === article.anchor ? 600 : 400,
                      color: active === article.anchor ? '#2563eb' : '#374151',
                      background: active === article.anchor ? '#eff6ff' : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    {article.title}
                  </button>
                ))}
              </div>
            );
          })}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: '48px 56px', maxWidth: 720 }}>
          {activeContent ? (
            <>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 24px' }}>{activeContent.title}</h1>
              <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8 }}>{activeContent.body}</div>
            </>
          ) : (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <p style={{ color: '#9ca3af' }}>Select an article from the sidebar.</p>
            </div>
          )}

          {/* Need more help */}
          <div style={{ marginTop: 64, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: 28 }}>
            <p style={{ fontWeight: 700, color: '#15803d', margin: '0 0 8px' }}>Need more help?</p>
            <p style={{ color: '#166534', fontSize: 14, margin: '0 0 16px' }}>Can&apos;t find the answer? Our support team is here to help.</p>
            <a href="/support" style={{ background: '#16a34a', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Contact Support</a>
          </div>
        </main>
      </div>
    </>
  );
}
