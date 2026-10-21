import { describe, expect, it } from "vitest";
import { MAX_EVENTS_PER_BATCH, eventsBatchRequestSchema } from "./events.js";

describe("eventsBatchRequestSchema", () => {
  it("accepts a valid mixed batch", () => {
    const parsed = eventsBatchRequestSchema.safeParse({
      events: [
        { type: "page_view", props: { path: "/es", locale: "es" } },
        { type: "tool_click", toolSlug: "password-generator", props: { section: "featured" } },
        { type: "search", props: { query: "pdf", results: 2 } },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown event types and missing tool slugs", () => {
    expect(eventsBatchRequestSchema.safeParse({ events: [{ type: "hack" }] }).success).toBe(false);
    expect(eventsBatchRequestSchema.safeParse({ events: [{ type: "tool_view" }] }).success).toBe(
      false,
    );
  });

  it("rejects oversized batches", () => {
    const events = Array.from({ length: MAX_EVENTS_PER_BATCH + 1 }, () => ({
      type: "tool_view",
      toolSlug: "word-counter",
    }));
    expect(eventsBatchRequestSchema.safeParse({ events }).success).toBe(false);
  });
});
