import type { AppProps } from 'next/app';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { CartProvider } from '@/lib/cart';
import { supabase } from '@/lib/supabase';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const supabaseClient = supabase;

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary>
      <SessionContextProvider
        supabaseClient={supabaseClient}
        initialSession={pageProps.initialSession}
      >
        <CartProvider>
        <Component {...pageProps} />
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#111827',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
        />
        </CartProvider>
      </SessionContextProvider>
    </ErrorBoundary>
  );
}
