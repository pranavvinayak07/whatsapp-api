/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiUrl}/api/v1/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/admin/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

