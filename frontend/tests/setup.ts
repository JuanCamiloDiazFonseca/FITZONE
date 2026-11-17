import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { unexpectedRequests } from "./support/network-guard";

vi.mock("next/navigation", async () => {
  const { router } = await import("./support/navigation");
  return { useRouter: () => router, usePathname: () => "/usuarios" };
});

beforeEach(() => {
  vi.clearAllMocks();
  unexpectedRequests.length = 0;
  // Never fall back to the real network, including when a mock is incomplete.
  vi.stubGlobal("fetch", vi.fn(() => {
    unexpectedRequests.push("Solicitud sin mock");
    throw new Error("Solicitud HTTP sin mock: no se permite acceso a la red.");
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  expect(unexpectedRequests).toEqual([]);
});
