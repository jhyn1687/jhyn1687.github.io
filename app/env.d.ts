export {};

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: {
        SUPABASE_URL: string;
        SUPABASE_ANON_KEY: string;
        MINDEE_API_KEY: string;
      };
      ctx: {
        waitUntil(promise: Promise<unknown>): void;
        passThroughOnException(): void;
      };
    };
  }
}
