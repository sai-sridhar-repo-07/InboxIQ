import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

// createClientComponentClient stores sessions in cookies (not localStorage)
// so they survive full-page navigations during OAuth redirects.
// flowType is set to 'implicit' via the Supabase dashboard:
//   Authentication → Providers → Google → Advanced → Flow Type → Implicit
export const supabase = createClientComponentClient();

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
