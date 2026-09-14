import type { MetadataRoute } from "next";
import { verticals } from "@/lib/verticals";

const PUBLIC_ORIGIN = "https://decision-integrity.wheelerhubbell.chatgpt.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: PUBLIC_ORIGIN,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${PUBLIC_ORIGIN}/industries`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...verticals.map((vertical) => ({
      url: `${PUBLIC_ORIGIN}/industries/${vertical.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
