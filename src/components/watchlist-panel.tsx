"use client";
import { useState } from "react";
type List = { id: string; name: string; terms: string[] };
export function WatchlistPanel({
  lists,
  onChange,
}: {
  lists: List[];
  onChange: (deletedId?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState("");
  const [terms, setTerms] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<string>();
  function reset() {
    setEditing(undefined);
    setName("");
    setTerms("");
    setDeleting(undefined);
  }
  async function send(remove?: string) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          remove
            ? { action: "delete", id: remove, confirmed: true }
            : {
                action: "save",
                id: editing,
                name,
                terms: terms
                  .split(/\r?\n/)
                  .map((value) => value.trim())
                  .filter(Boolean),
              },
        ),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      reset();
      await onChange(remove);
      setMessage(
        remove
          ? "Watchlist removed. Articles were preserved."
          : "Watchlist saved.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Watchlist update failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      className="panel watchlist-panel"
      aria-labelledby="watchlists-title"
    >
      <h2 id="watchlists-title" tabIndex={-1}>
        Your watchlists
      </h2>
      <p className="muted">
        Match any term literally in article titles or summaries. English letter
        case is ignored. Matches are relevance hints, not evidence of exposure.
        No extra network requests or alerts are sent.
      </p>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label>
          Watchlist name
          <input
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={pending}
          />
        </label>
        <label>
          <span id="watchlist-terms-label">Watchlist terms (one per line)</span>
          <textarea
            aria-labelledby="watchlist-terms-label"
            required
            rows={3}
            maxLength={700}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
            disabled={pending}
            aria-describedby="watchlist-limits"
          />
        </label>
        <p id="watchlist-limits" className="small muted">
          1–10 terms, up to 60 characters each. Up to 50 watchlists.
        </p>
        <div className="input-row">
          <button className="primary" disabled={pending}>
            {editing ? "Save watchlist changes" : "Create watchlist"}
          </button>
          {editing && (
            <button type="button" disabled={pending} onClick={reset}>
              Cancel editing
            </button>
          )}
        </div>
      </form>
      {!lists.length && (
        <p>
          No watchlists yet. Add technologies, threat topics or CVE IDs you
          follow.
        </p>
      )}
      <ul className="watchlist-list">
        {lists.map((list) => (
          <li key={list.id}>
            <strong>{list.name}</strong>
            <p className="small muted">{list.terms.join(" · ")}</p>
            <div className="input-row">
              <button
                type="button"
                aria-label={`Edit watchlist ${list.name}`}
                disabled={pending}
                onClick={() => {
                  setEditing(list.id);
                  setName(list.name);
                  setTerms(list.terms.join("\n"));
                  setDeleting(undefined);
                  setMessage("");
                }}
              >
                Edit
              </button>
              <button
                type="button"
                aria-label={`Remove watchlist ${list.name}`}
                disabled={pending}
                onClick={() => setDeleting(list.id)}
              >
                Remove
              </button>
            </div>
            {deleting === list.id && (
              <div className="stack">
                <p>
                  Remove watchlist “{list.name}”? Its matching articles will
                  stay.
                </p>
                <div className="input-row">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void send(list.id)}
                  >
                    Confirm removal
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeleting(undefined)}
                  >
                    Cancel removal
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
