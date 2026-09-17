import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp 는 네이티브 모듈 — 서버 번들에 넣지 않고 외부 패키지로 둔다
  serverExternalPackages: ["sharp"],
  // lib/geo.ts 가 런타임에 fs 로 읽는 GeoJSON 을 서버 번들에 포함
  outputFileTracingIncludes: {
    "/**/*": ["./data/**/*"],
    // pnpm 레이아웃에서는 sharp 의 플랫폼 바이너리(@img/sharp-linux-x64 등)가 트레이싱에서 빠져
    // Vercel 런타임에서 "Could not load the sharp module" 가 난다. 직접 포함시킨다.
    "/api/photos/process": [
      "./node_modules/.pnpm/@img+sharp-*/**/*",
      "./node_modules/.pnpm/sharp@*/node_modules/@img/**",
    ],
  },
};

export default nextConfig;
