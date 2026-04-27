export {};

import type { Ai } from "@cloudflare/workers-types";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: {
        SUPABASE_URL: string;
        SUPABASE_ANON_KEY: string;
        AI: Ai;
      };
      ctx: {
        waitUntil(promise: Promise<unknown>): void;
        passThroughOnException(): void;
      };
    };
  }
}
