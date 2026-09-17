import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp 는 네이티브 모듈 — 서버 번들에 넣지 않고 외부 패키지로 둔다
  serverExternalPackages: ["sharp"],
  // lib/geo.ts 가 런타임에 fs 로 읽는 GeoJSON 을 서버 번들에 포함
  outputFileTracingIncludes: {
    "/**/*": ["./data/**/*"],
    // sharp 의 플랫폼 바이너리 패키지(@img/sharp-linux-x64 등)는 트레이서가 놓친다 — 직접 포함 (hoisted 레이아웃이라 심볼릭 링크 없음)
    "/api/photos/process": ["./node_modules/@img/**/*"],
  },
};

export default nextConfig;
