import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  // `/a<digits>` and `/s<digits>` are rewritten to /share/* in next.config.ts,
  // but middleware runs *before* rewrites — so we need to whitelist the short
  // forms here too, otherwise authenticated-only redirect kicks in first.
  const isPublic =
    pathname.startsWith('/share') ||
    pathname.startsWith('/login') ||
    /^\/[as]\d+$/.test(pathname);

  if (!isPublic && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/login') && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const role = (user?.user_metadata?.role as UserRole) ?? 'user';
  if ((pathname.startsWith('/expenses') || pathname.startsWith('/nitch')) && role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
