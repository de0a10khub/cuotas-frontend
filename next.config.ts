import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // .next fuera de OneDrive para evitar lockfile contention + acelerar dev
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
