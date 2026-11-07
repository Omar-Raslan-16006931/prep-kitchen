import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prep Kitchen",
    short_name: "Prep",
    description: "Meal prep, costs and macros",
    start_url: "/",
    display: "standalone",
    background_color: "#fff6ec",
    theme_color: "#fff6ec",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
