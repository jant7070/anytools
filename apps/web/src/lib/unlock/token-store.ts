/**
 * Unlock tokens live only in memory (never localStorage/sessionStorage): a reload or a new tab
 * requires a new ad. The server still enforces expiry; this is just to avoid useless requests.
 */
export interface StoredUnlock {
  token: string;
  expiresAt: number;
}

const tokens = new Map<string, StoredUnlock>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export const unlockStore = {
  /** Raw entry without expiry handling (side-effect free, for useSyncExternalStore snapshots). */
  peek(toolSlug: string): StoredUnlock | null {
    return tokens.get(toolSlug) ?? null;
  },
  get(toolSlug: string, now = Date.now()): StoredUnlock | null {
    const entry = tokens.get(toolSlug);
    if (!entry) return null;
    if (entry.expiresAt - now <= 1000) {
      tokens.delete(toolSlug);
      return null;
    }
    return entry;
  },
  set(toolSlug: string, token: string, expiresAt: number) {
    tokens.set(toolSlug, { token, expiresAt });
    emit();
  },
  clear(toolSlug: string) {
    if (tokens.delete(toolSlug)) emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
