import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.bill.$code";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { code } = params;
  if (!code) {
    return Response.json({ error: "No code provided" }, { status: 400 });
  }

  const supabase = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_ANON_KEY,
  );

  const { data, error } = await supabase
    .from("bill_shares")
    .select("bill_json")
    .eq("id", code)
    .single();

  if (error || !data) {
    return Response.json(
      { error: "Share link not found or expired" },
      { status: 404 },
    );
  }

  return Response.json({ bill: data.bill_json });
}
