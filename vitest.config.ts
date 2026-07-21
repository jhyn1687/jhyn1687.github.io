import { defineConfig } from "vitest/config";

// Standalone from vite.config.ts on purpose: the Cloudflare and React Router
// plugins spin up a Workers/SSR environment that unit tests neither need nor
// can run inside. This config keeps only the `~/*` path resolution the app
// relies on (via Vite's native tsconfig paths support), and runs tests in
// jsdom so browser globals (localStorage, DOM) are available to the modules
// that touch them.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
  },
});
