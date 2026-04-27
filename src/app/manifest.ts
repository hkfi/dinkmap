import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DinkMap — NYC pickleball crowd map",
    short_name: "DinkMap",
    description:
      "Map NYC public pickleball courts and see live-ish crowd estimates from weather, time, and verified court-side reports.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5fbf6",
    theme_color: "#0f6f48",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
