import { POPULAR_WINDOW_DAYS } from "@anytools/shared";
import type { Redis } from "ioredis";
import type { Clock } from "../lib/clock.js";

const DAY_MS = 86_400_000;
const dayStamp = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
const dayKey = (stamp: string) => `popular:day:${stamp}`;
const eligibleKey = (toolSlug: string, visitorId: string) =>
  `popular:eligible:${toolSlug}:${visitorId}`;

/**
 * "Most used" ranking: one sorted set per UTC day (member = tool slug), merged over the last
 * POPULAR_WINDOW_DAYS days. A use counts only after a server-confirmed run, and a visitor counts
 * at most once per tool per day.
 */
export class PopularityService {
  constructor(
    private readonly redis: Redis,
    private readonly clock: Clock,
  ) {}

  /**
   * Called by the server after a real, unlocked run. Only then may a client `tool_used` event
   * count, so forged events cannot inflate the ranking.
   */
  async markEligible(toolSlug: string, visitorId: string): Promise<void> {
    await this.redis.set(eligibleKey(toolSlug, visitorId), "1", "EX", 15 * 60);
  }

  async recordUse(toolSlug: string, visitorId: string): Promise<boolean> {
    if (!(await this.redis.getdel(eligibleKey(toolSlug, visitorId)))) return false;
    const stamp = dayStamp(this.clock.now());
    const first = await this.redis.set(
      `popular:seen:${stamp}:${toolSlug}:${visitorId}`,
      "1",
      "EX",
      2 * 86_400,
      "NX",
    );
    if (first !== "OK") return false;
    const key = dayKey(stamp);
    await this.redis
      .multi()
      .zincrby(key, 1, toolSlug)
      .expire(key, (POPULAR_WINDOW_DAYS + 1) * 86_400)
      .exec();
    return true;
  }

  /** Top slugs over the window, most used first. The merged set is cached for 5 minutes. */
  async top(limit: number): Promise<string[]> {
    const now = this.clock.now();
    const cacheKey = `popular:window:${dayStamp(now)}`;
    if (!(await this.redis.exists(cacheKey))) {
      const days = Array.from({ length: POPULAR_WINDOW_DAYS }, (_, i) =>
        dayKey(dayStamp(new Date(now.getTime() - i * DAY_MS))),
      );
      await this.redis
        .multi()
        .zunionstore(cacheKey, days.length, ...days)
        .expire(cacheKey, 300)
        .exec();
    }
    return this.redis.zrevrange(cacheKey, 0, limit - 1);
  }
}
