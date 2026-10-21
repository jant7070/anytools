import { type Database, unlockSessions } from "@anytools/db";
import { UNLOCK_SESSION_PENDING_TTL_SECONDS, UNLOCK_TOKEN_TTL_SECONDS } from "@anytools/shared";
import type { StorageProvider } from "@anytools/tools/storage";
import { and, eq, lt, or } from "drizzle-orm";

/** Marks pending sessions that never got verified, and finished unlock windows, as expired. */
export async function expireStaleUnlockSessions(db: Database, now: Date): Promise<number> {
  const pendingCutoff = new Date(now.getTime() - UNLOCK_SESSION_PENDING_TTL_SECONDS * 1000);
  const verifiedCutoff = new Date(now.getTime() - UNLOCK_TOKEN_TTL_SECONDS * 1000);
  const rows = await db
    .update(unlockSessions)
    .set({ status: "expired" })
    .where(
      or(
        and(eq(unlockSessions.status, "pending"), lt(unlockSessions.createdAt, pendingCutoff)),
        and(eq(unlockSessions.status, "verified"), lt(unlockSessions.verifiedAt, verifiedCutoff)),
      ),
    )
    .returning({ id: unlockSessions.id });
  return rows.length;
}

export async function runMaintenance(
  deps: { db: Database; storage: StorageProvider },
  now = new Date(),
) {
  const [files, sessions] = await Promise.all([
    deps.storage.deleteExpired(now),
    expireStaleUnlockSessions(deps.db, now),
  ]);
  return { files, sessions };
}
