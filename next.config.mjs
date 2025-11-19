/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Increase file upload limits for CSV task import
    serverComponentsExternalPackages: [],
  },
  // Fix for OneDrive file locking issues on Windows
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Disable webpack cache completely to prevent file lock issues
  webpack: (config, { dev }) => {
    // Disable all caching in development
    if (dev) {
      config.cache = false;
      // Disable file system watcher aggregation
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 300,
        poll: 1000, // Use polling instead of file watchers
        ignored: /node_modules/,
      };
    }
    // Disable symlinks which cause issues with OneDrive
    config.resolve = {
      ...config.resolve,
      symlinks: false,
    };
    return config;
  },
  // Increase body size limit to 100MB for file uploads
  async headers() {
    return [
      {
        source: '/api/tasks/upload-excel',
        headers: [
          {
            key: 'Content-Length',
            value: '104857600', // 100MB in bytes
          },
        ],
      },
    ];
  },
};

export default nextConfig;
