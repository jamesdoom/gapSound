import { memo } from "react";
import Markdown from "react-markdown";
import { safeUrl } from "@/lib/security";
export const SafeMarkdown = memo(function SafeMarkdown({
  body,
  headingLevel = 4,
}: {
  body: string;
  headingLevel?: 3 | 4;
}) {
  return (
    <div className="markdown-body">
      <Markdown
        urlTransform={(url) => safeUrl(url) ?? ""}
        allowedElements={[
          "p",
          "strong",
          "em",
          "ul",
          "ol",
          "li",
          "pre",
          "code",
          "blockquote",
          "a",
          "hr",
          "br",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "img",
        ]}
        components={{
          h1: ({ children }) =>
            headingLevel === 3 ? <h3>{children}</h3> : <h4>{children}</h4>,
          h2: ({ children }) =>
            headingLevel === 3 ? <h3>{children}</h3> : <h4>{children}</h4>,
          h3: ({ children }) =>
            headingLevel === 3 ? <h3>{children}</h3> : <h4>{children}</h4>,
          h4: ({ children }) =>
            headingLevel === 3 ? <h3>{children}</h3> : <h4>{children}</h4>,
          h5: ({ children }) =>
            headingLevel === 3 ? <h3>{children}</h3> : <h4>{children}</h4>,
          h6: ({ children }) =>
            headingLevel === 3 ? <h3>{children}</h3> : <h4>{children}</h4>,
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ alt }) => <span>[Image omitted{alt ? ": " + alt : ""}]</span>,
        }}
      >
        {body.slice(0, 20000)}
      </Markdown>
    </div>
  );
});
