import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cho phép truy cập dev server từ điện thoại trong cùng mạng LAN (tránh cảnh báo
  // cross-origin của Next dev). Đổi IP ở đây nếu mạng cấp IP khác.
  allowedDevOrigins: ["192.168.1.18", "localhost"],
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
