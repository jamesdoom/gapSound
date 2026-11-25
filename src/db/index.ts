import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";
mkdirSync("data", { recursive: true });
export const client = createClient({ url: "file:data/gapsound.db" });
export const db = drizzle(client, { schema });
