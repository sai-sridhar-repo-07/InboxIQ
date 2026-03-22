import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { Zap, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SigninPage() {
  const router = useRouter();
  const { session, isLoading } = useSessionContext();

  useEffect(() => {
    if (!isLoading && session) {
      const next = (router.query.next as string) || '/dashboard';
      router.replace(next);
    }
  }, [session, isLoading, router]);

  return (
    <>
      <Head>
        <title>Sign In — Mailair</title>
        <meta name="description" content="Sign in to your Mailair account." />
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-md">
            {/* Back to home */}
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            {/* Logo */}
            <div className="flex items-center mb-8">
              <img src="/logo.svg" alt="Mailair" className="h-9 w-auto" />
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="mt-2 text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="font-medium text-primary-600 hover:text-primary-700">
                  Sign up for free
                </Link>
              </p>
            </div>

            {/* Auth form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <Auth
                supabaseClient={supabase}
                view="sign_in"
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
                        // Force white background throughout
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
                    sign_in: {
                      email_label: 'Email address',
                      password_label: 'Password',
                      button_label: 'Sign in to Mailair',
                      social_provider_text: 'Continue with {{provider}}',
                      link_text: 'Forgot your password?',
                    },
                  },
                }}
              />
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              Protected by enterprise-grade security.{' '}
              <a href="#" className="underline hover:text-gray-600">Learn more</a>
            </p>
          </div>
        </div>

        {/* Right decorative panel */}
        <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary-600 to-primary-900 items-center justify-center p-16">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
                <Zap className="h-10 w-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Your inbox, managed by AI
            </h2>
            <p className="text-primary-200 text-base leading-relaxed">
              Sign in to access your priority inbox, action items, and AI-powered insights — all in one place.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
