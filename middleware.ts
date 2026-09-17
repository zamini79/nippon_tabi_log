import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/auth"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          if (headers) {
            Object.entries(headers).forEach(([k, v]) => supabaseResponse.headers.set(k, v));
          }
        },
      },
    },
  );

  // 토큰 서명을 검증하고 만료 시 갱신한다. getSession() 은 쿠키를 그대로 믿으므로 쓰지 않는다.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url), supabaseResponse);
  }
  if (signedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url), supabaseResponse);
  }
  return supabaseResponse;
}

/** 다른 응답을 돌려줄 때는 갱신된 세션 쿠키와 캐시 헤더를 옮겨 담아야 한다. */
function withSessionCookies(target: NextResponse, source: NextResponse) {
  for (const c of source.cookies.getAll()) target.cookies.set(c);
  for (const h of ["cache-control", "expires", "pragma"]) {
    const v = source.headers.get(h);
    if (v) target.headers.set(h, v);
  }
  return target;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|geojson)$).*)",
  ],
};
