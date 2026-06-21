import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "localhost",
        pathname: "/api/storage/blobs/**",
        port: "3001",
        protocol: "http",
      },
    ],
  },
  output: process.env.NEXT_OUTPUT === "export" ? "export" : undefined,
  transpilePackages: ["@repo/shared"],
};

export default nextConfig;
