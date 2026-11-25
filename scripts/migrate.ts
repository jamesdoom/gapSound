import { client } from "../src/db";
import { migrateDatabase } from "../src/db/migrate";
try {
  const applied = await migrateDatabase(client);
  console.log(
    applied.length
      ? "Applied migrations: " + applied.join(", ")
      : "Database is up to date",
  );
} finally {
  client.close();
}
