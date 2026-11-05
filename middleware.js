import { next } from "@vercel/functions";

// /ingest is same-origin so analytics survives blockers, which means browsers attach this
// site's cookies to it, session cookie included, and vercel.json then proxies the request
// to PostHog. Cookies are dropped here so a sign-in token never reaches a third party.
export const config = { matcher: "/ingest/:path*" };

export default function middleware(request) {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  return next({ request: { headers } });
}
