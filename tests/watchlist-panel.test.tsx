// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WatchlistPanel } from "../src/components/watchlist-panel";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("retains a stable terms label when editing a prefilled watchlist", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ id: "test" }) });
  vi.stubGlobal("fetch", fetcher);
  render(
    <WatchlistPanel
      lists={[
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Web stack",
          terms: ["phishing"],
        },
      ]}
      onChange={vi.fn().mockResolvedValue(undefined)}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Edit watchlist Web stack" }),
  );
  const terms = screen.getByLabelText("Watchlist terms (one per line)", {
    exact: true,
  });
  expect((terms as HTMLTextAreaElement).value).toBe("phishing");
  fireEvent.change(terms, { target: { value: "CVE-2099-11111" } });
  fireEvent.click(
    screen.getByRole("button", { name: "Save watchlist changes" }),
  );
  await screen.findByText("Watchlist saved.");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    action: "save",
    terms: ["CVE-2099-11111"],
  });
});
