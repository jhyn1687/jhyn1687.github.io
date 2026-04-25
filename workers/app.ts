import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

type CloudflareEnv = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  MINDEE_API_KEY: string;
};

type CloudflareCtx = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

export default {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: CloudflareCtx,
  ): Promise<Response> {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
};
