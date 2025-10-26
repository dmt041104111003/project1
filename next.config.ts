import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['snarkjs', 'ffjavascript', 'web-worker'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('web-worker', 'ffjavascript', { snarkjs: 'commonjs snarkjs' });
    }
    return config;
  },
};

export default nextConfig;
