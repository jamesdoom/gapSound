// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Dashboard } from "../src/components/dashboard";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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
