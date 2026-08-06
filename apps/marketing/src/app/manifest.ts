import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Signa - Document Signing Infrastructure",
    short_name: "Signa",
    description:
      "Build, send, embed, and verify document signing workflows with Signa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#102852",
    icons: [
      {
        src: "/icons/signa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/signa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
