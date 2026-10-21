import { createDb } from "@anytools/db";
import { runMigrations } from "@anytools/db/migrate";
import { seed } from "@anytools/db/seed";
import { TEST_DATABASE_URL } from "./test-env.js";

/** Migrates and seeds the dedicated test database once per run. */
export default async function setup() {
  try {
    await runMigrations(TEST_DATABASE_URL);
  } catch (error) {
    throw new Error(
      `Cannot prepare the test database at ${TEST_DATABASE_URL}. Is \`docker compose up -d\` running?\n${String(error)}`,
    );
  }
  const { db, close } = createDb(TEST_DATABASE_URL, { max: 1 });
  try {
    await seed(db);
  } finally {
    await close();
  }
}
