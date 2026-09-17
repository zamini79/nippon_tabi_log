import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/geo.ts 가 런타임에 fs 로 읽는 GeoJSON 을 서버 번들에 포함
  outputFileTracingIncludes: {
    "/**/*": ["./data/**/*"],
  },
};

export default nextConfig;
