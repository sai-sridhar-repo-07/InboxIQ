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
        <title>Sign In — InboxIQ</title>
        <meta name="description" content="Sign in to your InboxIQ account." />
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
            <div className="flex items-center gap-2.5 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">InboxIQ</span>
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
            <div className="card p-8">
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
                        inputBorder: '#e5e7eb',
                        inputLabelText: '#374151',
                        inputText: '#111827',
                        inputBackground: '#ffffff',
                        defaultButtonBackground: '#ffffff',
                        defaultButtonBackgroundHover: '#f9fafb',
                        defaultButtonBorder: '#e5e7eb',
                        defaultButtonText: '#374151',
                      },
                      radii: {
                        borderRadiusButton: '0.75rem',
                        buttonBorderRadius: '0.75rem',
                        inputBorderRadius: '0.5rem',
                      },
                      fontSizes: {
                        baseButtonSize: '0.875rem',
                        baseInputSize: '0.875rem',
                      },
                    },
                  },
                  className: {
                    button: 'font-semibold shadow-sm',
                    label: 'text-sm font-medium',
                  },
                }}
                providers={['google']}
                redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
                localization={{
                  variables: {
                    sign_in: {
                      email_label: 'Email address',
                      password_label: 'Password',
                      button_label: 'Sign in to InboxIQ',
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
