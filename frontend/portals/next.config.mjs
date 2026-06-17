/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The API is reached via nginx in prod; in dev we proxy /api/* to the gateway.
  async rewrites() {
    const apiBase = process.env.MEDGUARD_API_BASE ?? 'http://localhost/api';
    return [
      { source: '/api/:path*', destination: `${apiBase}/:path*` },
      { source: '/school/students', destination: '/school?section=students' },
      { source: '/school/services', destination: '/school?section=services' },
      { source: '/school/lea-agreement', destination: '/school?section=lea-agreement' },
      { source: '/school/claims', destination: '/school?section=claims' },
    ];
  },
};
export default nextConfig;
