import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  serverExternalPackages: ["markitdown-js", "pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // PDF.js loads its worker and canvas binary dynamically, so file tracing can't see them.
  outputFileTracingIncludes: {
    "/api/courses/[courseId]/materials": [
      "./node_modules/.pnpm/pdf-parse@*/node_modules/pdf-parse/dist/**",
      "./node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/legacy/build/**",
      "./node_modules/.pnpm/@napi-rs+canvas*/node_modules/@napi-rs/**",
    ],
  },
};

export default nextConfig;
