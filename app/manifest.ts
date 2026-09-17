import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "나의 일본 여행 지도",
    short_name: "일본 여행 지도",
    description: "다녀온 도시와 현을 지도에 채워가는 개인 여행 기록",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4EFE6",
    theme_color: "#F4EFE6",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
