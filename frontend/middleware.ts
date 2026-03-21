import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth is enforced client-side via Layout.tsx because we use the implicit
// OAuth flow which stores the session in localStorage — not in cookies.
// The middleware-based Supabase client reads cookies only and would always
// see the user as unauthenticated, causing an infinite redirect loop.
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
};
