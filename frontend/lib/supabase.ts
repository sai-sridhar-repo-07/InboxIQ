import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use implicit flow so the OAuth token arrives in the URL hash and survives
// the full-page navigation that Next.js performs during Google OAuth redirect.
// PKCE flow stores the code_verifier in localStorage which gets lost on redirect.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);
