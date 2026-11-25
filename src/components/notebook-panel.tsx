"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { listNotes, exportNotes } from "@/services/notebook";
import { splitTags } from "@/lib/notebook";
import { SafeMarkdown } from "./safe-markdown";
type Data = Awaited<ReturnType<typeof listNotes>>;
type Note = Data["items"][number];
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const NotebookPanel = memo(function NotebookPanel({
  query,
}: {
  query: string;
}) {
  const [result, setResult] = useState<{ key: string; value: Data }>(),
    [page, setPage] = useState(1),
    [tag, setTag] = useState("");
  const [editing, setEditing] = useState<Note>(),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [tags, setTags] = useState("");
  const [pending, setPending] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const filterKey = JSON.stringify([query, tag, page]);
  const data = result?.key === filterKey ? result.value : undefined;
  const titleInput = useRef<HTMLInputElement>(null),
    version = useRef(0),
    lastQuery = useRef(query),
    exportAbort = useRef<AbortController | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const id = ++version.current;
      setLoading(true);
      try {
        const response = await fetch(
          "/api/notebook?" +
            new URLSearchParams({ q: query, tag, page: String(page) }),
          { signal },
        );
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        if (id === version.current) {
          setResult({ key: filterKey, value });
          setError("");
        }
      } finally {
        if (id === version.current && !signal?.aborted) setLoading(false);
      }
    },
    [query, tag, page, filterKey],
  );
  const latestLoad = useRef(load);
  useEffect(() => {
    latestLoad.current = load;
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (lastQuery.current !== query) {
        lastQuery.current = query;
        if (page !== 1) {
          setPage(1);
          return;
        }
      }
      void load(controller.signal).catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, query, page]);
  useEffect(() => () => exportAbort.current?.abort(), []);
  function reset() {
    setEditing(undefined);
    setTitle("");
    setBody("");
    setTags("");
  }
  async function save() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "note",
          id: editing?.id,
          revision: editing?.revision,
          title,
          body,
          tags,
        }),
      });
      const value = await response.json();
      if (!response.ok) {
        if (response.status === 409) await latestLoad.current();
        throw new Error(value.error);
      }
      reset();
      await latestLoad.current();
      setMessage("Research note saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note");
    } finally {
      setPending(false);
    }
  }
  async function exportAll() {
    setPending(true);
    setError("");
    setMessage("");
    const controller = new AbortController();
    exportAbort.current = controller;
    try {
      const items: Note[] = [];
      let cursor: Awaited<ReturnType<typeof exportNotes>>["next"] = null;
      let bytes = 0;
      for (let batch = 0; batch < 500; batch++) {
        const params = new URLSearchParams({ q: query, tag, export: "true" });
        if (cursor) params.set("cursor", JSON.stringify(cursor));
        const response = await fetch("/api/notebook?" + params, {
          signal: controller.signal,
        });
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        const result = value as Awaited<ReturnType<typeof exportNotes>>;
        bytes += new TextEncoder().encode(JSON.stringify(result.items)).length;
        if (bytes > 10 * 1024 * 1024)
          throw new Error(
            "Export exceeds 10 MiB. Filter by tag/search or export individual pages.",
          );
        items.push(...result.items);
        cursor = result.next;
        if (!cursor) {
          const content = JSON.stringify(items, null, 2);
          if (new TextEncoder().encode(content).length > 10 * 1024 * 1024)
            throw new Error(
              "Export exceeds 10 MiB. Filter by tag/search or export individual pages.",
            );
          download("gapsound-notes.json", content, "application/json");
          setMessage("Exported " + items.length + " matching notes.");
          return;
        }
      }
      throw new Error("Export exceeds 10,000 notes. Narrow your filters.");
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setPending(false);
      exportAbort.current = null;
    }
  }
  function filterTag(value: string) {
    setTag(value);
    setPage(1);
  }
  return (
    <div className="training-layout">
      <section className="panel">
        <h2>{editing ? "Edit investigation" : "Capture an investigation"}</h2>
        <p className="muted">
          Markdown supports headings, lists, emphasis, quotes and code. HTML
          stays text; images are omitted and only HTTPS links are clickable.
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label>
            Title
            <input
              ref={titleInput}
              required
              maxLength={200}
              value={title}
              disabled={pending}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Tags
            <input
              maxLength={500}
              value={tags}
              disabled={pending}
              placeholder="authentication, incident-response"
              onChange={(e) => setTags(e.target.value)}
            />
          </label>
          <p className="small muted">
            Comma-separated; up to 20 tags of 40 characters. English letter case
            and duplicates are normalized.
          </p>
          <label>
            <span id="research-body-label">Research note</span>
            <textarea
              aria-labelledby="research-body-label"
              required
              maxLength={20000}
              rows={12}
              value={body}
              disabled={pending}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div className="input-row">
            <button className="primary" disabled={pending}>
              {editing ? "Save note changes" : "Save note"}
            </button>
            <button type="button" disabled={pending} onClick={reset}>
              Cancel draft
            </button>
          </div>
        </form>
        <details>
          <summary>Markdown preview</summary>
          <SafeMarkdown body={body} headingLevel={3} />
        </details>
        {error && <p role="alert">{error}</p>}
        <p role="status">{message}</p>
      </section>
      <section className="panel" aria-busy={loading}>
        <h2>Your research</h2>
        <p className="muted">
          Searches title, content and tags literally. Twenty notes per page.
          Exports follow the current search and tag filter.
        </p>
        <label>
          Filter by tag
          <select
            value={tag}
            disabled={pending}
            onChange={(e) => filterTag(e.target.value)}
          >
            <option value="">All tags</option>
            {tag && !data?.tags.some((t) => t.tag === tag) && (
              <option value={tag}>{tag}</option>
            )}
            {data?.tags.map((t) => (
              <option key={t.tag} value={t.tag}>
                {t.tag} ({t.count})
              </option>
            ))}
          </select>
        </label>
        <p className="small muted">
          Tag menu shows the 100 most-used tags. Note tags can also be selected
          below.
        </p>
        <div className="input-row">
          <button
            disabled={pending}
            onClick={() => void load().catch((e) => setError(e.message))}
          >
            Refresh notes
          </button>
          <button
            disabled={pending || loading || !data?.items.length}
            onClick={() =>
              download(
                "gapsound-notes-page-" + data!.page + ".json",
                JSON.stringify(data!.items, null, 2),
                "application/json",
              )
            }
          >
            Export JSON page
          </button>
          <button
            disabled={pending || loading || !data?.total}
            onClick={() => void exportAll()}
          >
            Export all matching JSON
          </button>
        </div>
        {loading && <p>Loading notes…</p>}
        {data?.total === 0 && <p>No notes in this view.</p>}
        {data?.items.map((note) => (
          <article className="article" key={note.id}>
            <div className="input-row">
              {splitTags(note.tags).map((t) => (
                <button
                  key={t}
                  className="tag"
                  disabled={pending}
                  onClick={() => filterTag(t)}
                >
                  Tag: {t}
                </button>
              ))}
            </div>
            <h3>{note.title}</h3>
            <SafeMarkdown body={note.body} />
            <div className="article-footer">
              <span>
                {new Date(note.createdAt).toLocaleString()}
                {note.updatedAt
                  ? " · Edited " + new Date(note.updatedAt).toLocaleString()
                  : ""}
              </span>
              <button
                disabled={pending}
                onClick={() => {
                  if (title || body || tags) {
                    setError(
                      "Finish or cancel your current draft before opening another note.",
                    );
                    return;
                  }
                  setEditing(note);
                  setTitle(note.title);
                  setBody(note.body);
                  setTags(note.tags);
                  titleInput.current?.focus();
                }}
              >
                Edit note
              </button>
              <button
                onClick={() =>
                  download(
                    note.id + ".md",
                    "# " +
                      note.title +
                      "\n\nTags: " +
                      note.tags +
                      "\n\n" +
                      note.body,
                    "text/markdown",
                  )
                }
              >
                Export Markdown
              </button>
            </div>
          </article>
        ))}
        {data && (
          <div className="input-row">
            <button
              disabled={pending || loading || data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              Previous notes
            </button>
            <span>
              Notes page {data.page} of {data.totalPages} · {data.total}{" "}
              matching
            </span>
            <button
              disabled={pending || loading || data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
            >
              Next notes
            </button>
          </div>
        )}
      </section>
    </div>
  );
});
