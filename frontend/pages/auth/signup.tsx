import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { Zap, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const benefits = [
  'Free for up to 5 AI-processed emails/month',
  'AI email categorization & prioritization',
  'Action item extraction',
  'Smart reply drafts',
];

export default function SignupPage() {
  const router = useRouter();
  const { session, isLoading } = useSessionContext();

  useEffect(() => {
    if (!isLoading && session) {
      router.replace('/dashboard');
    }
  }, [session, isLoading, router]);

  const plan = router.query.plan as string | undefined;

  return (
    <>
      <Head>
        <title>Sign Up — Mailair</title>
        <meta name="description" content="Create your Mailair account and start managing email with AI." />
      </Head>
      <div className="flex min-h-screen">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 flex-col justify-center px-16">
          <div className="flex items-center mb-12">
            <img src="/logo-dark.svg" alt="Mailair" className="h-9 w-auto" />
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            Your inbox, finally under control
          </h2>
          <p className="text-primary-200 text-lg leading-relaxed mb-10">
            Join hundreds of service business owners who use AI to triage email, extract action items, and never miss an important message.
          </p>
          <ul className="space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <span className="text-primary-100 text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
          {plan && (
            <div className="mt-10 rounded-xl bg-white/10 border border-white/20 px-5 py-4">
              <p className="text-white text-sm font-semibold">
                You are signing up for the <span className="capitalize">{plan}</span> plan.
              </p>
              <p className="text-primary-200 text-xs mt-1">You can change your plan any time from billing settings.</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 bg-white">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center mb-8">
              <img src="/logo.svg" alt="Mailair" className="h-8 w-auto" />
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="mt-2 text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="font-medium text-primary-600 hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </div>

            <Auth
              supabaseClient={supabase}
              view="sign_up"
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#2563eb',
                      brandAccent: '#1d4ed8',
                      brandButtonText: '#ffffff',
                      inputBorder: '#e5e7eb',
                      inputBorderFocus: '#2563eb',
                      inputBorderHover: '#d1d5db',
                      inputLabelText: '#374151',
                      inputText: '#111827',
                      inputPlaceholder: '#9ca3af',
                      inputBackground: '#ffffff',
                      defaultButtonBackground: '#ffffff',
                      defaultButtonBackgroundHover: '#f9fafb',
                      defaultButtonBorder: '#e5e7eb',
                      defaultButtonText: '#374151',
                      anchorTextColor: '#2563eb',
                      anchorTextHoverColor: '#1d4ed8',
                      dividerBackground: '#e5e7eb',
                      messageText: '#374151',
                      messageBackground: '#f9fafb',
                      messageBorder: '#e5e7eb',
                      backgroundPrimary: '#ffffff',
                      backgroundSecondary: '#f9fafb',
                      backgroundAlternative: '#ffffff',
                    },
                    radii: {
                      borderRadiusButton: '0.75rem',
                      buttonBorderRadius: '0.75rem',
                      inputBorderRadius: '0.625rem',
                    },
                    fontSizes: {
                      baseButtonSize: '0.9375rem',
                      baseInputSize: '0.9375rem',
                      baseLabelSize: '0.875rem',
                    },
                    fonts: {
                      bodyFontFamily: `'Inter', ui-sans-serif, system-ui, sans-serif`,
                      buttonFontFamily: `'Inter', ui-sans-serif, system-ui, sans-serif`,
                      inputFontFamily: `'Inter', ui-sans-serif, system-ui, sans-serif`,
                      labelFontFamily: `'Inter', ui-sans-serif, system-ui, sans-serif`,
                    },
                    space: {
                      inputPadding: '0.75rem 1rem',
                      buttonPadding: '0.75rem 1rem',
                    },
                  },
                },
                style: {
                  container: { background: 'transparent' },
                  message: { color: '#374151', background: '#fefce8', border: '1px solid #fef08a', borderRadius: '0.5rem' },
                  divider: { background: '#e5e7eb' },
                  label: { color: '#374151', fontWeight: '500' },
                  input: {
                    color: '#111827',
                    background: '#ffffff',
                    border: '1.5px solid #e5e7eb',
                    boxShadow: 'none',
                  },
                  button: { fontWeight: '600' },
                  anchor: { color: '#2563eb', fontWeight: '500' },
                },
                className: {
                  button: 'font-semibold shadow-sm',
                  label: 'text-sm font-medium text-gray-700',
                },
              }}
              providers={['google']}
              redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
              localization={{
                variables: {
                  sign_up: {
                    email_label: 'Work Email',
                    password_label: 'Password',
                    button_label: 'Create Account',
                    social_provider_text: 'Continue with {{provider}}',
                    link_text: '',
                  },
                },
              }}
            />

            <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
              By creating an account, you agree to our{' '}
              <a href="#" className="underline hover:text-gray-600">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
