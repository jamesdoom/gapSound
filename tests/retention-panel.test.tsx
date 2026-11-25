// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RetentionPanel } from "../src/components/retention-panel";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("requires fresh preview after an expired confirmation and shows an actionable error", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cutoff: "2026-01-01T00:00:00Z",
        ids: ["old"],
        eligibleCount: 1,
        retentionDays: 90,
      }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Preview expired. Preview cleanup again." }),
    });
  vi.stubGlobal("fetch", fetcher);
  const onChange = vi.fn();
  render(<RetentionPanel onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Preview cleanup" }));
  const remove = await screen.findByRole("button", {
    name: "Remove 1 old article records",
  });
  expect((remove as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(remove);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Preview cleanup again",
  );
  expect(
    screen.queryByRole("button", { name: "Remove 1 old article records" }),
  ).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});
