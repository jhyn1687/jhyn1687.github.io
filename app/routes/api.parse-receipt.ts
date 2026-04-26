import { createClient } from "@supabase/supabase-js";
import type { Route } from "./+types/api.parse-receipt";
import { parseReceiptText } from "~/components/splitter/parseReceiptText";

async function sha256hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export async function action({ request, context }: Route.ActionArgs) {
  const apiKey = context.cloudflare.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GCV not configured" }, { status: 503 });
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await sha256hex(ip);

  const supabase = createClient(
    context.cloudflare.env.SUPABASE_URL,
    context.cloudflare.env.SUPABASE_ANON_KEY,
  );
  const month = new Date().toISOString().slice(0, 7);

  const { data } = await supabase.rpc("check_and_increment_ocr", {
    p_month: month,
    p_ip_key: ipHash,
    p_global_cap: 900,
    p_ip_cap: 10,
  });
  if (!data?.[0]?.allowed) {
    return Response.json({ error: "OCR quota reached" }, { status: 429 });
  }

  const incoming = await request.formData();
  const file = incoming.get("document");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = await (file as File).arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    return Response.json({ error: "GCV error" }, { status: res.status });
  }

  const json = (await res.json()) as {
    responses?: Array<{
      textAnnotations?: Array<{ description?: string }>;
    }>;
  };
  const text = json.responses?.[0]?.textAnnotations?.[0]?.description ?? "";
  return Response.json({ items: parseReceiptText(text) });
}
