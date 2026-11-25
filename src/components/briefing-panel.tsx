"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { readBriefings } from "@/services/briefings";
type Data = Awaited<ReturnType<typeof readBriefings>>;
export function BriefingPanel({
  day,
  onTraining,
}: {
  day: string;
  onTraining: () => void;
}) {
  const [data, setData] = useState<Data>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const version = useRef(0);
  const load = useCallback(
    async (id = selected) => {
      if (!day) return;
      const request = ++version.current;
      try {
        const response = await fetch(
          "/api/briefings?" +
            new URLSearchParams({ day, page: String(page), id }),
        );
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        if (request === version.current) {
          setData(value);
          setError("");
        }
      } catch (e) {
        if (request === version.current)
          setError(e instanceof Error ? e.message : "Could not load briefings");
      }
    },
    [day, page, selected],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function mutate(action: "generate" | "archive") {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const body =
        action === "generate"
          ? {
              action,
              day,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : { action, id: data?.view?.id };
      const response = await fetch("/api/briefings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      if (selected) setSelected("");
      await load("");
      setMessage(
        action === "generate"
          ? "Daily briefing saved. Previous versions are retained in history."
          : "Briefing archived. Its snapshot is retained in history.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Briefing update failed");
    } finally {
      setPending(false);
    }
  }
  const view = data?.view,
    snapshot = view?.snapshot;
  return (
    <section
      className="panel saved-briefing"
      aria-labelledby="daily-briefing-title"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">DAILY DEFENSIVE BRIEFING · RULE-BASED</span>
          <h2 id="daily-briefing-title">Your saved daily briefing</h2>
        </div>
        <div className="briefing-actions">
          <button
            disabled={pending || !day}
            onClick={() => void mutate("generate")}
          >
            {data?.currentId
              ? "Regenerate today’s briefing"
              : "Generate today’s briefing"}
          </button>
          {view && !view.archivedAt && (
            <button disabled={pending} onClick={() => void mutate("archive")}>
              Archive briefing
            </button>
          )}
          {selected && (
            <button disabled={pending} onClick={() => setSelected("")}>
              View today
            </button>
          )}
        </div>
      </div>
      <p className="small muted">
        Saved snapshots are independent of article filters. Generation uses
        stored metadata from the previous seven days; no AI or external network
        request is made. Source status reflects generation time. Refresh sources
        and regenerate to update it; coverage is incomplete.
      </p>
      {!data && !error && <p role="status">Loading saved briefings…</p>}
      {data && !snapshot && (
        <p>
          No saved briefing for {day}. Generate one to capture current
          intelligence and study objectives.
        </p>
      )}
      {snapshot && (
        <div className="briefing-content">
          <p className="small muted">
            {view.day} · {snapshot.timeZone} · Saved{" "}
            {new Date(view.createdAt).toLocaleString()}
            {view.archivedAt ? " · Archived snapshot" : ""}
          </p>
          <h3>Recent intelligence</h3>
          {!snapshot.news.length && (
            <p>
              No eligible recent articles in stored data. Refresh sources before
              regenerating.
            </p>
          )}
          <ul>
            {snapshot.news.map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
                <p className="small muted">
                  {item.source} · Published{" "}
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleString()
                    : "Unknown"}
                  {item.saved ? " · Bookmarked" : ""}
                  {item.matchedTerms.length
                    ? ` · Watchlist terms: ${item.matchedTerms.join(", ")}`
                    : ""}
                </p>
                {item.summary && <p>{item.summary}</p>}
              </li>
            ))}
          </ul>
          <h3>Recently added to CISA KEV</h3>
          <p className="small muted">
            Catalog addition date is not vulnerability disclosure time or proof
            of your exposure.
          </p>
          {!snapshot.kevs.length && (
            <p>
              No recent KEV additions in stored data. This does not establish
              that there were none.
            </p>
          )}
          <ul>
            {snapshot.kevs.map((item) => (
              <li key={item.id}>
                <a
                  href={`https://www.cve.org/CVERecord?id=${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.id}
                </a>{" "}
                · {item.name}
                <p className="small muted">
                  Added {item.addedAt}.{" "}
                  <a
                    href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    CISA catalog
                  </a>
                </p>
                <p>{item.action}</p>
              </li>
            ))}
          </ul>
          <h3>Investigation prompt</h3>
          {snapshot.news[0] ? (
            <p>
              Review{" "}
              <a
                href={snapshot.news[0].url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {snapshot.news[0].title}
              </a>
              . Identify the supported attack vector and missing evidence. Do
              not assume this report describes a confirmed attack on your
              systems.
            </p>
          ) : (
            <p>
              No source-backed lead available. Refresh intelligence to select an
              investigation.
            </p>
          )}
          <h3>Learning focus</h3>
          <p>
            {snapshot.learning.topic}.{" "}
            <a
              href={snapshot.learning.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the official CISA catalog guidance
            </a>
            .
          </p>
          <p>{snapshot.learning.question}</p>
          <details>
            <summary>Show assessment answer</summary>
            <p>{snapshot.learning.answer}</p>
          </details>
          <h3>Study objectives at generation</h3>
          {snapshot.objectives.length ? (
            <ul>
              {snapshot.objectives.map((item, index) => (
                <li key={index}>
                  {item.done ? "Completed" : "Planned"} · {item.title}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No study objectives were recorded for this day when the briefing
              was generated.
            </p>
          )}
          <button onClick={onTraining}>Open daily training</button>
          <h3>Review prompts</h3>
          <p className="small muted">
            Completed objectives from the previous seven days to revisit. These
            are suggestions, not scheduled due dates; spaced repetition is not
            implemented.
          </p>
          {snapshot.reviewPrompts.length ? (
            <ul>
              {snapshot.reviewPrompts.map((item, index) => (
                <li key={index}>
                  {item.day} · {item.title}
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent completed objectives available.</p>
          )}
          <h3>Source freshness at generation</h3>
          <ul>
            {snapshot.sources.map((source) => (
              <li key={source.name}>
                {source.name}: <strong>{source.status}</strong> · Last success{" "}
                {source.lastSuccess
                  ? new Date(source.lastSuccess).toLocaleString()
                  : "Never"}
              </li>
            ))}
          </ul>
        </div>
      )}
      <details className="briefing-history">
        <summary>Briefing history ({data?.pagination.total ?? 0})</summary>
        {!data?.history.length && <p>No saved snapshots yet.</p>}
        <ul>
          {data?.history.map((item) => (
            <li key={item.id}>
              <button
                disabled={pending}
                data-briefing-id={item.id}
                onClick={() => setSelected(item.id)}
              >
                Open {item.day} · {new Date(item.createdAt).toLocaleString()} ·{" "}
                {item.archivedAt ? "Archived" : "Saved"}
              </button>
            </li>
          ))}
        </ul>
        {data && (
          <nav className="pagination" aria-label="Briefing history pages">
            <button
              disabled={pending || data.pagination.page <= 1}
              onClick={() => setPage(data.pagination.page - 1)}
            >
              Previous briefings
            </button>
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <button
              disabled={
                pending || data.pagination.page >= data.pagination.totalPages
              }
              onClick={() => setPage(data.pagination.page + 1)}
            >
              Next briefings
            </button>
          </nav>
        )}
      </details>
      {message && <p role="status">{message}</p>}
      {error && (
        <div role="alert">
          {error}{" "}
          <button disabled={pending} onClick={() => void load()}>
            Retry briefings
          </button>
        </div>
      )}
    </section>
  );
}
