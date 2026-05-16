import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [nitroV2Plugin()],
  },
});