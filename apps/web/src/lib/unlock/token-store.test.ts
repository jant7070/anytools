import { describe, expect, it, vi } from "vitest";
import { unlockStore } from "./token-store";

describe("unlockStore", () => {
  it("keeps tokens per tool and forgets them when they expire", () => {
    const now = Date.now();
    unlockStore.set("a", "token-a", now + 60_000);
    expect(unlockStore.get("a", now)?.token).toBe("token-a");
    expect(unlockStore.get("b", now)).toBeNull();
    expect(unlockStore.get("a", now + 60_000)).toBeNull();
    expect(unlockStore.get("a", now)).toBeNull();
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = unlockStore.subscribe(listener);
    unlockStore.set("c", "t", Date.now() + 10_000);
    unlockStore.clear("c");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
