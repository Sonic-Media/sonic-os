import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
  env: {
    // Expose trusted Vercel deployment tier to the client so Preview is not
    // mislabeled as Production solely because APP_ENV/APP_MODE=production.
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },
};

export default nextConfig;
