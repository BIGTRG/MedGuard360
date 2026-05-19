/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The API is reached via nginx in prod; in dev we proxy /api/* to the gateway.
  async rewrites() {
    const apiBase = process.env.MEDGUARD_API_BASE ?? 'http://localhost/api';
    return [
      { source: '/api/:path*', destination: `${apiBase}/:path*` },
    ];
  },
};
export default nextConfig;
