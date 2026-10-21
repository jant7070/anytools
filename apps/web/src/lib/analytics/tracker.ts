import { type AnalyticsEvent, MAX_EVENTS_PER_BATCH } from "@anytools/shared";

const ENDPOINT = "/api/events";
const FLUSH_DELAY_MS = 3000;
const FLUSH_SIZE = 10;

type Forwarder = (event: AnalyticsEvent) => void;

const queue: AnalyticsEvent[] = [];
const forwarders = new Set<Forwarder>();
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

/** Optional third-party sinks (e.g. PostHog) receive every first-party event as well. */
export function addForwarder(forwarder: Forwarder): () => void {
  forwarders.add(forwarder);
  return () => forwarders.delete(forwarder);
}

function send(events: AnalyticsEvent[], useBeacon: boolean) {
  const body = JSON.stringify({ events });
  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  }
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // Analytics must never break the page.
  });
}

/** Sends queued events. With `useBeacon`, survives page unloads. */
export function flush(useBeacon = false) {
  clearTimeout(timer);
  timer = undefined;
  while (queue.length > 0) send(queue.splice(0, MAX_EVENTS_PER_BATCH), useBeacon);
}

/** Queues a first-party analytics event; batches are sent every few seconds or on page hide. */
export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined") return;
  if (!listening) {
    listening = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush(true);
    });
  }
  queue.push(event);
  for (const forward of forwarders) {
    try {
      forward(event);
    } catch {
      // Ignore third-party failures.
    }
  }
  if (queue.length >= FLUSH_SIZE) flush();
  else timer ??= setTimeout(() => flush(), FLUSH_DELAY_MS);
}
