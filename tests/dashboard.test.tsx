// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Dashboard } from "../src/components/dashboard";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps cleanup results when preferences finish loading during a request", async () => {
  const data = {
    items: [],
    sources: [],
    kevs: [],
    checklist: [],
    sessions: [],
    notes: [],
    settings: { id: "local", weeklyHours: 12, refreshMinutes: 60 },
    counts: { total: 0, bookmarks: 0, kev: 0 },
  };
  let resolveInitial!: (value: unknown) => void;
  let resolveCleanup!: (value: unknown) => void;
  const initial = new Promise((resolve) => {
    resolveInitial = resolve;
  });
  const cleanupResult = new Promise((resolve) => {
    resolveCleanup = resolve;
  });
  let reads = 0;
  const fetcher = vi.fn((url: string, options?: RequestInit) => {
    if (url.startsWith("/api/workspace"))
      return ++reads === 1
        ? initial
        : Promise.resolve({ ok: true, json: async () => data });
    const input = JSON.parse(String(options?.body));
    return input.action === "preview"
      ? Promise.resolve({
          ok: true,
          json: async () => ({
            cutoff: "2026-01-01T00:00:00Z",
            ids: ["old"],
            eligibleCount: 1,
            retentionDays: 90,
          }),
        })
      : cleanupResult;
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Dashboard />);
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  await waitFor(() => expect(reads).toBe(1));
  fireEvent.click(screen.getByRole("button", { name: "Preview cleanup" }));
  const remove = await screen.findByRole("button", {
    name: "Remove 1 old article records",
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(remove);
  await act(async () => {
    resolveInitial({ ok: true, json: async () => data });
  });
  await act(async () => {
    resolveCleanup({ ok: true, json: async () => ({ deletedCount: 1 }) });
  });
  expect(
    (await screen.findByText(/Removed 1 old article records/)).textContent,
  ).toContain("Bookmarks and personal records were preserved");
});
it("shows actionable database errors without hiding the workspace", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error:
          "Database unavailable. Run npm run db:migrate before starting GapSound.",
      }),
    }),
  );
  render(<Dashboard />);
  expect(screen.getByText("Loading your workspace…").textContent).toContain(
    "Loading",
  );
  expect((await screen.findByRole("alert")).textContent).toContain(
    "npm run db:migrate",
  );
  expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
});
