// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PublisherNotices } from "../src/components/publisher-notices";
import { publisherNotices } from "../src/lib/publisher-notices";
afterEach(cleanup);
it("renders supplied snapshot notice text as inert text rather than current or executable content", () => {
  const bundle = structuredClone(publisherNotices);
  bundle.items = [
    {
      ...bundle.items[0],
      text: 'Historical notice <img src=x onerror="alert(1)">',
    },
  ];
  const { container } = render(<PublisherNotices bundle={bundle} />);
  expect(screen.getByText(bundle.items[0].text)).toBeDefined();
  expect(container.querySelector("img")).toBeNull();
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector('a[href="/api/notices"]')).toBeDefined();
});
