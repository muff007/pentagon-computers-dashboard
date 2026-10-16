import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast redirect for requests that carry no session cookie at all.
 *
 * This is a convenience, not the security boundary: it only checks that a
 * cookie is present, because signature verification needs node:crypto which is
 * not available in the proxy runtime. The authoritative check happens in the
 * dashboard layout, which validates the HMAC on every render — a forged cookie
 * gets past here and is rejected there.
 */
/**
 * Files served straight out of public/ — the logo on the login page is one of
 * them, and it is requested precisely when there is no session yet.
 */
const STATIC_FILE = /\.(?:jpe?g|png|gif|webp|avif|svg|ico|txt|xml|woff2?|ttf)$/i;

/**
 * Installing the dashboard to a phone happens before there is any session, so
 * these three have to answer without a cookie. Redirecting them to /login
 * silently breaks installation: the browser fetches the worker, is handed a
 * redirect, and registration fails with nothing to show for it.
 */
const PWA_FILE = new Set([
  "/sw.js",
  "/manifest.webmanifest",
  "/offline",
  // Android fetches this anonymously to decide whether the installed app may
  // drop its address bar. Behind the login it would never be read.
  "/.well-known/assetlinks.json",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    PWA_FILE.has(pathname) ||
    STATIC_FILE.test(pathname);

  if (isPublic) return NextResponse.next();

  if (!request.cookies.get("penta_admin")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
