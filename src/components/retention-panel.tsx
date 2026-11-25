"use client";
import { useState } from "react";
import type { RetentionPreview } from "@/services/retention";
export function RetentionPanel({
  onChange,
}: {
  onChange: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<RetentionPreview>();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function request(cleanup: boolean) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          cleanup
            ? {
                action: "cleanup",
                confirmed: true,
                cutoff: preview?.cutoff,
                ids: preview?.ids,
              }
            : { action: "preview" },
        ),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setConfirmed(false);
      if (cleanup) {
        setPreview(undefined);
        setMessage(
          `Removed ${body.deletedCount} old article records. Bookmarks and personal records were preserved.`,
        );
        await onChange();
      } else setPreview(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cleanup request failed");
      setPreview(undefined);
      setConfirmed(false);
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-labelledby="retention-title">
      <h3 id="retention-title">Feed data retention</h3>
      <p className="muted">
        Manually remove unbookmarked article metadata ingested more than 90 days
        ago. Bookmarks, notes, study records and the KEV catalog are preserved.
        Nothing is removed automatically.
      </p>
      <p className="small muted">
        Cleanup removes article records and their read status, up to 400 at a
        time. Original articles may return if a source republishes them. Back up
        your data directory before cleanup; there is no undo.
      </p>
      <div className="stack">
        <button
          type="button"
          disabled={pending}
          onClick={() => void request(false)}
        >
          {pending ? "Working…" : "Preview cleanup"}
        </button>
        {preview && (
          <>
            <p role="status">
              {preview.eligibleCount} eligible article records. This batch
              contains {preview.ids.length}. Cutoff:{" "}
              {new Date(preview.cutoff).toLocaleString()}. Preview expires after
              15 minutes.
            </p>
            {preview.ids.length > 0 && (
              <>
                <label>
                  <span>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      disabled={pending}
                    />{" "}
                    I understand this removes the previewed article records and
                    their read status.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={pending || !confirmed}
                  onClick={() => void request(true)}
                >
                  Remove {preview.ids.length} old article records
                </button>
              </>
            )}
          </>
        )}
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
