export {};

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: {
        SUPABASE_URL: string;
        SUPABASE_ANON_KEY: string;
        GOOGLE_CLOUD_VISION_API_KEY: string;
      };
      ctx: {
        waitUntil(promise: Promise<unknown>): void;
        passThroughOnException(): void;
      };
    };
  }
}
