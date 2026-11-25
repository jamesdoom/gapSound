"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { readReviews } from "@/services/reviews";
export function ReviewPanel({ day }: { day: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof readReviews>>>();
  const [page, setPage] = useState(1),
    [title, setTitle] = useState(""),
    [dueDay, setDueDay] = useState(day),
    [editing, setEditing] = useState<string>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const requestVersion = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      const response = await fetch("/api/reviews?page=" + page, { signal });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      if (version === requestVersion.current) setData(value);
    },
    [page],
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void load(controller.signal).catch((e) => {
        if (active) setError(e.message);
      });
    }, 0);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [load]);
  async function send(value: unknown) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEditing(undefined);
      setTitle("");
      await load();
      setMessage("Review saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review update failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading">Scheduled reviews</h2>
      <p className="muted">
        Choose a local calendar date manually. Due and overdue reviews appear
        first. Completed records are retained; schedule a new review for another
        attempt. No notifications or automatic spaced repetition.
      </p>
      {error && <p role="alert">{error}</p>}
      <p role="status">{message}</p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void send(
            editing
              ? { action: "reschedule", id: editing, dueDay }
              : { action: "create", title, dueDay },
          );
        }}
      >
        {!editing && (
          <label>
            Review topic
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={pending}
            />
          </label>
        )}
        {editing && (
          <p>
            Rescheduling:{" "}
            {data?.items.find((item) => item.id === editing)?.title}
          </p>
        )}
        <label>
          Review due date
          <input
            type="date"
            required
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            disabled={pending}
          />
        </label>
        <div className="input-row">
          <button className="primary" disabled={pending}>
            {editing ? "Save review date" : "Schedule review"}
          </button>
          {editing && (
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(undefined)}
            >
              Cancel reschedule
            </button>
          )}
        </div>
      </form>
      {!data && !error && <p>Loading reviews…</p>}
      {data?.total === 0 && <p>No reviews scheduled.</p>}
      {data?.items.map((item) => (
        <article key={item.id} className="source-status">
          <div>
            <strong>{item.title}</strong>
            <p>
              {item.completedAt
                ? "Completed · " + new Date(item.completedAt).toLocaleString()
                : item.dueDay < day
                  ? "Overdue"
                  : item.dueDay === day
                    ? "Due today"
                    : "Upcoming"}{" "}
              · Due {item.dueDay}
            </p>
            {!item.completedAt && (
              <div className="input-row">
                <button
                  disabled={pending}
                  onClick={() => void send({ action: "complete", id: item.id })}
                >
                  Mark reviewed
                </button>
                <button
                  disabled={pending}
                  onClick={() => {
                    setEditing(item.id);
                    setDueDay(item.dueDay);
                  }}
                >
                  Reschedule review
                </button>
              </div>
            )}
          </div>
        </article>
      ))}
      {data && (
        <div className="input-row">
          <button
            disabled={pending || data.page <= 1}
            onClick={() => {
              setEditing(undefined);
              setPage(data.page - 1);
            }}
          >
            Previous reviews
          </button>
          <span>
            Review page {data.page} of {data.totalPages}
          </span>
          <button
            disabled={pending || data.page >= data.totalPages}
            onClick={() => {
              setEditing(undefined);
              setPage(data.page + 1);
            }}
          >
            Next reviews
          </button>
        </div>
      )}
    </section>
  );
}
