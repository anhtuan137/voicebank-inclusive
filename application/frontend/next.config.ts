import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingExcludes: {
    "*": ["./legacy-dashboard/**"],
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
