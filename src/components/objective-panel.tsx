"use client";
import { useEffect, useState } from "react";

type Entry = { id: string; title: string };
type Plan = { revision: number; titles: string[] };
export function ObjectivePanel({
  day,
  onApplied,
}: {
  day: string;
  onApplied: () => Promise<void>;
}) {
  const [saved, setSaved] = useState<Plan>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function accept(plan: Plan) {
    setSaved(plan);
    setEntries(
      plan.titles.map((title) => ({ id: crypto.randomUUID(), title })),
    );
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/objectives", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) accept(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Could not load objective plan",
          );
      });
    return () => controller.abort();
  }, []);
  const dirty =
    saved &&
    JSON.stringify(entries.map((e) => e.title.trim())) !==
      JSON.stringify(saved.titles);
  async function send(action: "save" | "apply" | "reload") {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response =
        action === "reload"
          ? await fetch("/api/objectives")
          : await fetch("/api/objectives", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                action === "save"
                  ? {
                      action,
                      revision: saved?.revision,
                      titles: entries.map((e) => e.title),
                    }
                  : {
                      action,
                      revision: saved?.revision,
                      day,
                      timeZone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                    },
              ),
            });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (action !== "apply") accept(result);
      else await onApplied();
      setMessage(
        action === "apply"
          ? "Saved plan added to today's checklist."
          : action === "save"
            ? "Objective plan saved. Existing daily checklists are unchanged."
            : "Saved plan reloaded.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Objective plan update failed");
    } finally {
      setPending(false);
    }
  }
  function move(index: number, delta: number) {
    setEntries((current) => {
      const next = [...current];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  return (
    <section className="panel" aria-labelledby="objective-plan-heading">
      <h2 id="objective-plan-heading">Reusable objective plan</h2>
      <p className="muted">
        Save up to 20 objectives in your preferred order. Apply the saved plan
        once per local day. Changes never rewrite existing checklists,
        completions or saved briefings.
      </p>
      {error && <p role="alert">{error}</p>}
      <p role="status" aria-live="polite">
        {message}
      </p>
      {!saved && !error && <p>Loading objective plan…</p>}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void send("save");
        }}
      >
        <fieldset
          className="objective-plan-fields"
          disabled={pending || !saved}
        >
          <legend>Plan objectives</legend>
          {entries.length === 0 && (
            <p className="muted">
              No reusable objectives configured. You can still add one-off daily
              objectives.
            </p>
          )}
          {entries.map((entry, index) => (
            <div key={entry.id} className="stack">
              <label>
                Plan objective {index + 1}
                <input
                  value={entry.title}
                  maxLength={200}
                  required
                  onChange={(e) =>
                    setEntries((current) =>
                      current.map((item) =>
                        item.id === entry.id
                          ? { ...item, title: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <div className="objective-plan-actions">
                <button
                  type="button"
                  aria-label={`Move up objective ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  aria-label={`Move down objective ${index + 1}`}
                  disabled={index === entries.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Move down
                </button>
                <button
                  type="button"
                  aria-label={`Remove objective ${index + 1} from plan`}
                  onClick={() =>
                    setEntries((current) =>
                      current.filter((item) => item.id !== entry.id),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={entries.length >= 20}
            onClick={() =>
              setEntries((current) => [
                ...current,
                { id: crypto.randomUUID(), title: "" },
              ])
            }
          >
            Add plan objective
          </button>
          <button type="submit">Save objective plan</button>
          <button
            type="button"
            disabled={!!dirty || !saved?.titles.length}
            onClick={() => void send("apply")}
          >
            Apply saved plan to today
          </button>
        </fieldset>
      </form>
      {dirty && (
        <p className="muted">
          Save your changes before applying the plan. Reloading discards this
          editor’s unsaved changes.
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => void send("reload")}
      >
        Reload saved plan
      </button>
    </section>
  );
}
