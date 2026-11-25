// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SafeMarkdown } from "../src/components/safe-markdown";
afterEach(cleanup);
it("renders Markdown structure while keeping HTML inert, removing images and blocking unsafe links", () => {
  const { container } = render(
    <SafeMarkdown
      body={
        '# Topic\n\n**Evidence** and *analysis*\n\n- First\n- Second\n\n`code`\n\n<script>alert(1)</script>\n\n<img src="https://tracker.example/pixel" onerror="alert(1)">\n\n![tracking](https://tracker.example/pixel)\n\n[Unsafe](javascript:alert%281%29) [Local](https://localhost.invalid.local/x) [Good](https://www.cisa.gov/)'
      }
    />,
  );
  expect(screen.getByRole("heading", { name: "Topic" }).tagName).toBe("H4");
  expect(container.querySelector("strong")?.textContent).toBe("Evidence");
  expect(container.querySelectorAll("li")).toHaveLength(2);
  expect(container.querySelectorAll("script,img,iframe,style")).toHaveLength(0);
  expect(screen.queryByRole("link", { name: "Unsafe" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Local" })).toBeNull();
  expect(screen.getByRole("link", { name: "Good" }).getAttribute("href")).toBe(
    "https://www.cisa.gov/",
  );
  expect(screen.getByText("[Image omitted: tracking]")).toBeDefined();
});
