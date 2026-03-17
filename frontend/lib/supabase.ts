import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

// Force implicit flow so the OAuth code_verifier survives the redirect.
// PKCE flow loses the verifier stored in localStorage when Next.js does
// a full-page navigation during the Google OAuth redirect.
export const supabase = createClientComponentClient({
  options: { auth: { flowType: 'implicit' } },
});

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
