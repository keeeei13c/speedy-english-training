/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', を削除
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;