import { createClient } from "@/lib/supabase/server";
import { getFieldDefs } from "@/lib/data";
import { BulkImport } from "@/components/bulk-import";

export default async function ImportPage() {
  const supabase = await createClient();
  const [fieldDefs, { data: numberRows }] = await Promise.all([
    getFieldDefs(),
    // id/number/title of every song, so each draft can say which song a typed
    // number would clash with.
    supabase.from("songs").select("id, number, title").order("number"),
  ]);

  return (
    <BulkImport
      fieldDefs={fieldDefs}
      songNumbers={(numberRows ?? []).map((r) => ({ id: r.id, number: r.number, title: r.title }))}
    />
  );
}
