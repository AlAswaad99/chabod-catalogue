import { createClient } from "@/lib/supabase/server";
import { SlideGenerator } from "@/components/slide-generator";
import type { Song } from "@/types/song";

export default async function SlidesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("songs").select("id, number, title, lyrics").order("number");

  return (
    <SlideGenerator songs={(data ?? []) as unknown as Pick<Song, "id" | "number" | "title" | "lyrics">[]} />
  );
}
