import { NextResponse } from "next/server";
import { getVertical, verticalDescriptor, verticals } from "@/lib/verticals";

export function generateStaticParams() {
  return verticals.map((vertical) => ({ slug: vertical.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vertical = getVertical(slug);
  if (!vertical) {
    return NextResponse.json({ error: "vertical_not_found" }, { status: 404 });
  }
  return NextResponse.json(verticalDescriptor(vertical), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
