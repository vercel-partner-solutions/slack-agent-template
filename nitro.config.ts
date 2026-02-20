import { resolve } from "node:path";
import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "server",
  compatibilityDate: "2025-07-27",
  modules: ["@workflow/nitro"],
  alias: {
    "~": resolve("./server"),
  },
});
