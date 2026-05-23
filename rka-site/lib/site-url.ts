/**
 * Production: set before `npm run build` (same host as Hosting).
 * Example: https://my-rka-project.web.app
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3011";
