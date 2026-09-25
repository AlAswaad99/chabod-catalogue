import { createClient } from "@/lib/supabase/server";
import { SlideGenerator } from "@/components/slide-generator";
import type { Song } from "@/types/song";

export default async function SlidesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("songs").select("id, title, lyrics").order("title");

  return <SlideGenerator songs={(data ?? []) as unknown as Pick<Song, "id" | "title" | "lyrics">[]} />;
}
