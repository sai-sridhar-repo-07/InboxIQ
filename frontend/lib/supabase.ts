import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Implicit flow: OAuth token returns in the URL hash — no code_verifier needed.
// This avoids the "PKCE code verifier not found" error that occurs when
// Next.js does a full-page navigation and clears the PKCE state from storage.
// Session is persisted in localStorage and survives page navigations.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'implicit',
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'mailair-auth',
  },
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
