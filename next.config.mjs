/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved from experimental in Next.js 16
  serverExternalPackages: [],
  
  // Empty turbopack config to silence webpack warning
  turbopack: {},
  
  // Fix for OneDrive file locking issues on Windows
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  
  // Webpack config for development only
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 300,
        poll: 1000,
        ignored: /node_modules/,
      };
    }
    config.resolve = {
      ...config.resolve,
      symlinks: false,
    };
    return config;
  },
  
  // IMPORTANT: Vercel body size limits
  // Hobby: 4.5MB, Pro: 10MB, Enterprise: 50MB
  // Headers don't override Vercel's limits - use bodyLimit middleware instead
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Body-Size-Warning',
            value: 'Max 4MB on Vercel Hobby plan',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
