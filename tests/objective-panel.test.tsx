// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ObjectivePanel } from "../src/components/objective-panel";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps edited/reordered drafts on a stale save and requires saving before application", async () => {
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) =>
    options?.method
      ? {
          ok: false,
          json: async () => ({ error: "The plan changed in another tab." }),
        }
      : {
          ok: true,
          json: async () => ({ revision: 3, titles: ["DNS", "TLS"] }),
        },
  );
  vi.stubGlobal("fetch", fetcher);
  render(<ObjectivePanel day="2026-11-25" onApplied={vi.fn()} />);
  await screen.findByDisplayValue("DNS");
  fireEvent.click(screen.getByRole("button", { name: "Move up objective 2" }));
  expect(
    (screen.getByLabelText("Plan objective 1") as HTMLInputElement).value,
  ).toBe("TLS");
  fireEvent.change(screen.getByLabelText("Plan objective 1"), {
    target: { value: "TLS edited" },
  });
  expect(
    (
      screen.getByRole("button", {
        name: "Apply saved plan to today",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Save objective plan" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "The plan changed in another tab.",
  );
  expect(
    (screen.getByLabelText("Plan objective 1") as HTMLInputElement).value,
  ).toBe("TLS edited");
  const [, options] = fetcher.mock.calls.at(-1)!;
  expect(JSON.parse(String(options?.body))).toEqual({
    action: "save",
    revision: 3,
    titles: ["TLS edited", "DNS"],
  });
});
it("recovers from load failure without offering mutations before a plan is loaded", async () => {
  let reads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      ++reads === 1
        ? { ok: false, json: async () => ({ error: "Unavailable" }) }
        : { ok: true, json: async () => ({ revision: 0, titles: [] }) },
    ),
  );
  render(<ObjectivePanel day="2026-11-25" onApplied={vi.fn()} />);
  await screen.findByText("Unavailable");
  expect(
    (
      screen.getByRole("group", {
        name: "Plan objectives",
      }) as HTMLFieldSetElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Reload saved plan" }));
  await screen.findByText("Saved plan reloaded.");
  fireEvent.click(screen.getByRole("button", { name: "Add plan objective" }));
  expect(screen.getByLabelText("Plan objective 1")).toBeDefined();
});
it("applies the saved revision with the displayed day and refreshes the checklist", async () => {
  const onApplied = vi.fn(async () => {});
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({
    ok: true,
    json: async () =>
      options?.method
        ? { applied: 1 }
        : { revision: 4, titles: ["Evidence review"] },
  }));
  vi.stubGlobal("fetch", fetcher);
  render(<ObjectivePanel day="2026-11-25" onApplied={onApplied} />);
  await screen.findByDisplayValue("Evidence review");
  fireEvent.click(
    screen.getByRole("button", { name: "Apply saved plan to today" }),
  );
  await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
  const [, options] = fetcher.mock.calls.at(-1)!;
  expect(JSON.parse(String(options?.body))).toMatchObject({
    action: "apply",
    revision: 4,
    day: "2026-11-25",
  });
  expect(
    await screen.findByText("Saved plan added to today's checklist."),
  ).toBeDefined();
});
