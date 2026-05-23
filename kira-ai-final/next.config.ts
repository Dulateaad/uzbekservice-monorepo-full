import type {NextConfig} from 'next';
import withPWA from 'next-pwa';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const defaultPwaCache = require('next-pwa/cache') as Array<Record<string, unknown>>;

/**
 * Firebase App Hosting (Cloud Build) задаёт FIREBASE_APP_HOSTING и ждёт
 * `output: 'standalone'` + apphosting-adapter-nextjs. Статический Hosting
 * (GitHub Actions: firebase deploy) — без этой переменной, `output: 'export'`.
 */
const isFirebaseAppHosting = Boolean(
  process.env.FIREBASE_APP_HOSTING &&
    process.env.FIREBASE_APP_HOSTING !== '0' &&
    process.env.FIREBASE_APP_HOSTING !== 'false'
);

const nextConfig: NextConfig = {
  output: isFirebaseAppHosting ? 'standalone' : 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Статический export не использует серверный image optimizer
    ...(isFirebaseAppHosting ? {} : { unoptimized: true }),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Не кэшируем HTML-навигацию и *.txt (RSC flight при static export) — иначе после деплоя
  // старый SW отдаёт trends.html / trends.txt со ссылками на удалённые чанки → 404.
  runtimeCaching: [
    {
      urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
      handler: 'NetworkOnly',
      method: 'GET',
    },
    {
      urlPattern: ({ url }: { url: URL }) => url.pathname.endsWith('.txt'),
      handler: 'NetworkOnly',
      method: 'GET',
    },
    ...defaultPwaCache,
  ],
});

export default pwaConfig(nextConfig);
