import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient(env: {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

export function getImageUrl(
  supabase: ReturnType<typeof getSupabaseClient>,
  bucket: string,
  path: string,
): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
