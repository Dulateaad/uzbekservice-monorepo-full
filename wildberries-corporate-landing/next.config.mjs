/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  /** /mentors/elena-gromova/ → out/mentors/elena-gromova/index.html (удобно для Firebase) */
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
