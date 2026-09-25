import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSlideDeck } from "@/lib/slides/build-deck";
import type { SlideDeckSpec } from "@/lib/slides/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const spec = (await request.json()) as SlideDeckSpec;

  if (!spec.songs?.length) {
    return NextResponse.json({ error: "Select at least one song." }, { status: 400 });
  }

  const buffer = await buildSlideDeck(spec);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${spec.deckTitle || "songs"}.pptx"`,
    },
  });
}
