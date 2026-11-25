import { resolve, join } from "node:path";
import { backupDatabase, restoreDatabase } from "../src/db/backup";

const [action, ...args] = process.argv.slice(2);
try {
  if (action === "backup" && args.length === 1) {
    await backupDatabase(
      join(resolve(process.env.GAPSOUND_DATA_DIR || "data"), "gapsound.db"),
      resolve(args[0]),
    );
  } else if (action === "restore" && args.length === 2) {
    await restoreDatabase(resolve(args[0]), resolve(args[1]));
  } else throw new Error("Invalid arguments");
  console.log(
    "Verified. Keep backup/restore directories private; existing workspaces were not overwritten.",
  );
} catch {
  console.error(
    "Operation failed. Use db:backup -- <new-bundle-directory> or db:restore -- <bundle-directory> <new-data-directory>. Incomplete output must not be used; existing directories cannot be overwritten.",
  );
  process.exitCode = 1;
}
