import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/dev/vite/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    cloudflareDevProxy(),
    tailwindcss(),
    reactRouter(),
    cloudflare({
      viteEnvironment: {
        name: "ssr",
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
