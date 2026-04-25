import type { Route } from "./+types/api.parse-receipt";

export async function action({ request, context }: Route.ActionArgs) {
  const apiKey = context.cloudflare.env.MINDEE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "MINDEE_API_KEY not configured" }, { status: 503 });
  }

  const incoming = await request.formData();
  const file = incoming.get("document");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const body = new FormData();
  body.append("document", file);

  const res = await fetch(
    "https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict",
    {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}` },
      body,
    },
  );

  if (!res.ok) {
    return Response.json({ error: "Mindee request failed" }, { status: res.status });
  }

  const data = (await res.json()) as {
    document?: {
      inference?: {
        prediction?: {
          line_items?: Array<{ description: string; total_amount: number }>;
        };
      };
    };
  };

  const lineItems =
    data?.document?.inference?.prediction?.line_items ?? [];

  return Response.json({
    items: lineItems.map((li) => ({
      description: li.description ?? "",
      total_amount: li.total_amount ?? 0,
    })),
  });
}
