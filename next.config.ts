import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./src/lib/travelBrain/creativeAuditSnapshot.json"],
  },
};

export default nextConfig;
