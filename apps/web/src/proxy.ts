import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing (Next.js 16 renamed `middleware` to `proxy`).
export default createMiddleware(routing);

export const config = {
  // Skip the API, Next internals and files with an extension (sitemap.xml, robots.txt, icons).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
