// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NotebookPanel } from "../src/components/notebook-panel";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("refuses oversized all-note exports without downloading a partial file", async () => {
  const note = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Evidence",
    body: "Body",
    tags: "",
    revision: 0,
    createdAt: "2026-11-25T12:00:00Z",
    updatedAt: null,
  };
  const createObjectURL = vi.fn();
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("export=true")
          ? {
              items: Array.from({ length: 20 }, () => ({
                ...note,
                body: "x".repeat(20000),
              })),
              next: {
                cutoff: note.createdAt,
                beforeAt: note.createdAt,
                beforeId: note.id,
              },
            }
          : { items: [note], tags: [], page: 1, totalPages: 1, total: 1 },
    })),
  );
  render(<NotebookPanel query="" />);
  const button = screen.getByRole("button", {
    name: "Export all matching JSON",
  });
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  fireEvent.click(button);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "exceeds 10 MiB",
  );
  expect(createObjectURL).not.toHaveBeenCalled();
});
