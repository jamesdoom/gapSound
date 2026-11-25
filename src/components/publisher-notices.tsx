import {
  publisherNotices,
  type PublisherNoticeBundle,
} from "@/lib/publisher-notices";

export function PublisherNotices({
  ids,
  bundle = publisherNotices,
}: {
  ids?: readonly string[];
  bundle?: PublisherNoticeBundle;
}) {
  return (
    <section
      className="publisher-notices"
      aria-label="Publisher attribution and license notices"
    >
      <p className="small muted">{bundle.scope}</p>
      {bundle.items
        .filter((notice) => !ids || ids.includes(notice.id))
        .map((notice) => (
          <div key={notice.id}>
            <p className="small">{notice.attribution}</p>
            <details>
              <summary>{notice.name} — full notice</summary>
              <pre className="notice-text">{notice.text}</pre>
              <a
                href={notice.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {notice.name} notice source
              </a>
            </details>
          </div>
        ))}
      <a href="/api/notices" download="gapsound-publisher-notices.json">
        Download publisher notices
      </a>
    </section>
  );
}
