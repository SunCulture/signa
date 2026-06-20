import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === "export" ? "export" : undefined,
  transpilePackages: ["@repo/shared"],
};

export default nextConfig;
