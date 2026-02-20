import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@synthesis/ui", "@synthesis/api", "@synthesis/db"],
};

export default nextConfig;
