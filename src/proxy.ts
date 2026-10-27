import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PROTECTED = ["/feed", "/dashboard", "/messages", "/schedule"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

const matches = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!SUPABASE_URL || !SUPABASE_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() (not getClaims) so the proxy and the pages agree on revoked/deleted sessions.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const redirectTo = (target: string) => {
    const res = NextResponse.redirect(new URL(target, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && matches(path, PROTECTED)) {
    return redirectTo(`/login?next=${encodeURIComponent(path + request.nextUrl.search)}`);
  }
  if (user && matches(path, AUTH_PAGES)) {
    const next = request.nextUrl.searchParams.get("next");
    return redirectTo(next ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)"],
};
