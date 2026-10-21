"use client";

import { useEffect, useRef } from "react";
import { loadScript } from "@/lib/load-script";

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Must be loaded from Cloudflare directly (proxying or caching it breaks Turnstile).
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Cloudflare Turnstile widget (explicit rendering). Tokens are single-use and verified by the API. */
export function Turnstile({
  siteKey,
  language,
  onToken,
  onError,
}: {
  siteKey: string;
  language: string;
  onToken: (token: string) => void;
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onToken, onError });
  useEffect(() => {
    callbacks.current = { onToken, onError };
  });

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript(SCRIPT_URL)
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: siteKey,
          language,
          theme: "auto",
          callback: (token: string) => callbacks.current.onToken(token),
          "error-callback": () => callbacks.current.onError(),
        });
      })
      .catch(() => callbacks.current.onError());
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, language]);

  return <div ref={container} className="flex min-h-[65px] justify-center" />;
}
