import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { Zap } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);

    // Check for OAuth error first
    const errorParam = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    const code = url.searchParams.get('code');

    if (code) {
      // PKCE flow — exchange the one-time code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(error.message);
        } else {
          router.replace('/dashboard');
        }
      });
    } else {
      // Implicit flow fallback — token is in the URL hash, Supabase handles it automatically
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          router.replace('/dashboard');
        }
      });

      // Also handle already-authenticated case (e.g. page refresh)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.replace('/dashboard');
      });

      return () => subscription.unsubscribe();
    }
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
              <span className="text-red-600 text-xl">✕</span>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="btn-primary"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 animate-pulse">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Verifying your account…</h1>
        <p className="text-sm text-gray-500 mt-1">You&apos;ll be redirected in a moment.</p>
      </div>
    </div>
  );
}
