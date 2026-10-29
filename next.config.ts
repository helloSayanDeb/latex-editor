import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingExcludes: { '/*': ['./projects/**/*', './docs/**/*', './scripts/**/*', './.git/**/*', './.tools/**/*', './tmp/**/*', './temp/**/*', './.venv-research/**/*', './lemmata-settings.json', './.lemmata-install.json', './.env', './.env.*'] },
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
