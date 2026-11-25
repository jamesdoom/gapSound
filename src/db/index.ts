import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import * as schema from "./schema";
// Runtime-only local data is not part of Next's deployment file tracing.
const directory = resolve(
  /* turbopackIgnore: true */ process.env.GAPSOUND_DATA_DIR || "data",
);
mkdirSync(directory, { recursive: true });
export const client = createClient({
  url: `file:${directory.replaceAll("\\", "/")}/gapsound.db`,
});
export const db = drizzle(client, { schema });
