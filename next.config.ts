import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingExcludes: { '*': ['projects/**/*', 'dist-desktop/**/*', 'desktop-server/**/*', 'docs/**/*', '.git/**/*'] },
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
