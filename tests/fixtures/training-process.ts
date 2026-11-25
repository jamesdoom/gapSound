import { client, db } from "../../src/db";
import { listArticles } from "../../src/services/intelligence";
import { migrateDatabase } from "../../src/db/migrate";
import {
  startSession,
  readTraining,
  stopSession,
} from "../../src/services/training";
async function main() {
  await migrateDatabase(client);
  const now = new Date("2026-11-25T16:00:00Z");
  if (process.argv[2] === "start")
    await startSession(db, new Date("2026-11-01T12:00:00Z"));
  const [state] = await Promise.all([
    readTraining(db, now),
    listArticles({ query: "", source: "", category: "", saved: false }, db),
  ]);
  if (process.argv[2] === "recover")
    await stopSession(
      {
        action: "stop",
        id: state.sessions[0].id,
        endedAt: "2026-11-25T15:00:00Z",
      },
      db,
      now,
    );
  process.stdout.write(JSON.stringify(await readTraining(db, now)));
  client.close();
}
void main().catch(() => {
  client.close();
  process.exitCode = 1;
});
