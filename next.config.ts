import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp 는 네이티브 모듈 — 서버 번들에 넣지 않고 외부 패키지로 둔다
  serverExternalPackages: ["sharp"],
  // lib/geo.ts 가 런타임에 fs 로 읽는 GeoJSON 을 서버 번들에 포함
  outputFileTracingIncludes: {
    "/**/*": ["./data/**/*"],
  },
};

export default nextConfig;
