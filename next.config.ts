import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["markitdown-js", "pdf-parse"],
};

export default nextConfig;
