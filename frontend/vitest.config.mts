import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.tsx"],
    env: { NEXT_PUBLIC_API_BASE_URL: "https://fitzone.test.invalid/api/v1" },
    restoreMocks: true,
    testTimeout: 10000,
  },
});
