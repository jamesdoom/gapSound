import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expect, it } from "vitest";
import { migrateDatabase } from "../src/db/migrate";
import * as schema from "../src/db/schema";
import {
  readTraining,
  startSession,
  stopSession,
} from "../src/services/training";
const now = new Date("2026-11-25T16:00:00Z");
async function fixture() {
  const client = createClient({ url: ":memory:" });
  await migrateDatabase(client);
  return { client, db: drizzle(client, { schema }) };
}
it("recovers an old active session, guards stale IDs and validates actual end times", async () => {
  const { client, db } = await fixture();
  try {
    await startSession(db, new Date("2026-11-01T12:00:00Z"));
    await startSession(db, now);
    const current = await readTraining(db, now);
    expect(current.sessions).toHaveLength(1);
    expect(current.studyMinutes).toBe(0);
    const id = current.sessions[0].id;
    for (const endedAt of ["2026-11-01T11:59:59Z", "2026-11-26T00:00:00Z"])
      await expect(
        stopSession({ action: "stop", id, endedAt }, db, now),
      ).rejects.toThrow("End time");
    await expect(
      stopSession({ action: "stop", id: crypto.randomUUID() }, db, now),
    ).rejects.toThrow("no longer active");
    await stopSession(
      { action: "stop", id, endedAt: "2026-11-01T13:00:00Z" },
      db,
      now,
    );
    expect((await db.select().from(schema.sessions))[0].endedAt).toBe(
      "2026-11-01T13:00:00Z",
    );
    await startSession(db, now);
    await expect(stopSession({ action: "stop", id }, db, now)).rejects.toThrow(
      "no longer active",
    );
    expect(
      (await readTraining(db, now)).sessions.find((s) => !s.endedAt),
    ).toBeDefined();
  } finally {
    client.close();
  }
});
it("clips completed minutes to the rolling seven-day window and excludes unfinished time", async () => {
  const { client, db } = await fixture();
  try {
    await db.insert(schema.sessions).values([
      {
        id: "boundary",
        startedAt: "2026-11-18T15:00:00Z",
        endedAt: "2026-11-18T17:00:00Z",
      },
      {
        id: "old",
        startedAt: "2026-11-10T15:00:00Z",
        endedAt: "2026-11-10T17:00:00Z",
      },
      {
        id: "recent",
        startedAt: "2026-11-25T15:00:00Z",
        endedAt: "2026-11-25T15:30:00Z",
      },
      { id: "active", startedAt: "2026-11-25T15:30:00Z" },
    ]);
    expect((await readTraining(db, now)).studyMinutes).toBe(90);
  } finally {
    client.close();
  }
});
it("keeps an old active session visible even with more than 1000 completed sessions", async () => {
  const { client, db } = await fixture();
  try {
    await startSession(db, new Date("2026-11-01T00:00:00Z"));
    for (let offset = 0; offset < 1001; offset += 100) {
      await db.insert(schema.sessions).values(
        Array.from({ length: Math.min(100, 1001 - offset) }, (_, i) => ({
          id: String(offset + i),
          startedAt: "2026-11-25T12:00:00Z",
          endedAt: "2026-11-25T12:01:00Z",
        })),
      );
    }
    const result = await readTraining(db, now);
    expect(result.sessions).toHaveLength(1000);
    expect(result.sessions[0].endedAt).toBeNull();
    expect(result.studyMinutes).toBe(1001);
  } finally {
    client.close();
  }
});

it("recovers the same unfinished session after a real backend process exits and restarts", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = mkdtempSync(join(tmpdir(), "gapsound-training-"));
  const run = (action: string) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ["--import", "tsx", "tests/fixtures/training-process.ts", action],
        {
          env: { ...process.env, GAPSOUND_DATA_DIR: directory },
          encoding: "utf8",
          timeout: 10000,
        },
      ),
    );
  const first = run("start"),
    second = run("read");
  expect(second.sessions[0].id).toBe(first.sessions[0].id);
  expect(second.sessions[0].endedAt).toBeNull();
  const recovered = run("recover");
  expect(recovered.sessions[0].endedAt).toBe("2026-11-25T15:00:00Z");
  expect(run("read")).toEqual(recovered);
}, 30000);
