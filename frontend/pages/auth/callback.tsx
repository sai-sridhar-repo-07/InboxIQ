import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { Zap } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // useRef persists across re-renders so the guard survives effect re-runs.
  const redirected = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    // Check for OAuth error in query params
    const errorParam = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    const go = () => {
      if (redirected.current) return;
      redirected.current = true;
      router.replace('/dashboard');
    };

    // Implicit flow: Supabase parses the access_token from the URL hash automatically.
    // onAuthStateChange fires once the token is processed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) go();
    });

    // Fallback: session already exists (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) go();
    }).catch(() => {
      // getSession failing here just means we wait for onAuthStateChange
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
