import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a Next.js server that scripts/e2e.sh has already started on :3100, itself pointed
 * at a Spring backend on :8081 and the throwaway postgres-e2e database. Nothing here starts servers.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "laptop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
