import { createClient, type Client } from "@libsql/client";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const manifestSchema = z.object({
  format: z.literal(1),
  createdAt: z.string().datetime(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  migrations: z.array(z.string().regex(/^\d{4}$/)).max(1000),
});
async function digest(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
function open(file: string) {
  return createClient({ url: pathToFileURL(resolve(file)).href });
}
async function verify(client: Client) {
  const integrity = await client.execute("PRAGMA integrity_check");
  if (integrity.rows.length !== 1 || integrity.rows[0].integrity_check !== "ok")
    throw new Error("Database integrity check failed");
  if ((await client.execute("PRAGMA foreign_key_check")).rows.length)
    throw new Error("Database foreign key check failed");
  const ids = (
    await client.execute("SELECT id FROM migrations ORDER BY id")
  ).rows.map((r) => String(r.id));
  if (!ids.length || ids.some((id) => !/^\d{4}$/.test(id)))
    throw new Error("Database migration history is missing or invalid");
  return ids;
}

// CLI-only filesystem operations. Neither function is exposed through an API.
// Creating the directory exclusively prevents replacement of existing workspaces.
export async function backupDatabase(source: string, destination: string) {
  if (!(await stat(source)).isFile())
    throw new Error("Source database is not a file");
  await mkdir(dirname(resolve(destination)), { recursive: true, mode: 0o700 });
  await mkdir(destination, { mode: 0o700 });
  const client = open(source);
  try {
    await client.execute({
      sql: "VACUUM INTO ?",
      args: [resolve(join(destination, "gapsound.db"))],
    });
  } finally {
    client.close();
  }
  const snapshot = open(join(destination, "gapsound.db"));
  let migrations: string[];
  try {
    migrations = await verify(snapshot);
  } finally {
    snapshot.close();
  }
  const manifest = {
    format: 1,
    createdAt: new Date().toISOString(),
    sha256: await digest(join(destination, "gapsound.db")),
    migrations,
  };
  await writeFile(
    join(destination, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  return manifest;
}

export async function restoreDatabase(bundle: string, destination: string) {
  const manifestFile = join(bundle, "manifest.json");
  if ((await stat(manifestFile)).size > 65536)
    throw new Error("Manifest too large");
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(manifestFile, "utf8")),
  );
  await mkdir(dirname(resolve(destination)), { recursive: true, mode: 0o700 });
  await mkdir(destination, { mode: 0o700 });
  const file = join(destination, "gapsound.db");
  await copyFile(join(bundle, "gapsound.db"), file, constants.COPYFILE_EXCL);
  if ((await digest(file)) !== manifest.sha256)
    throw new Error(
      "Backup checksum mismatch; do not use this restore directory",
    );
  const client = open(file);
  try {
    if (
      JSON.stringify(await verify(client)) !==
      JSON.stringify(manifest.migrations)
    )
      throw new Error("Backup migration history mismatch");
  } finally {
    client.close();
  }
  return manifest;
}
