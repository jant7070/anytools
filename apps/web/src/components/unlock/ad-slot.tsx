"use client";

import type { AdClientConfig } from "@anytools/shared";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { loadScript } from "@/lib/load-script";
import { Spinner } from "../icons";

export interface AdSlotProps {
  config: AdClientConfig;
  sessionId: string;
  /** The ad finished on the client. The server still decides whether it counts. */
  onComplete: () => void;
  /** No ad could be shown (no fill, blocked, failed to load). */
  onUnavailable: (reason: string) => void;
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Fake ad for development: a visible countdown. */
function DevAd({
  config,
  onComplete,
}: AdSlotProps & { config: Extract<AdClientConfig, { provider: "dev" }> }) {
  const t = useTranslations("unlock");
  const [left, setLeft] = useState(config.countdownSeconds);
  const done = useLatest(onComplete);

  // Count down against a deadline so throttled timers cannot slow the ad down.
  useEffect(() => {
    const deadline = Date.now() + config.countdownSeconds * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        done.current();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [config.countdownSeconds, done]);

  const progress = ((config.countdownSeconds - left) / config.countdownSeconds) * 100;
  return (
    <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-6 text-center dark:bg-amber-950/30">
      <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-300">
        {t("adLabel")}
      </p>
      <p className="mt-2 text-lg font-bold">{t("devAdTitle")}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("devAdBody")}</p>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900"
        aria-hidden="true"
      >
        <div
          className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-sm" aria-live="polite">
        {t("secondsLeft", { seconds: Math.max(left, 0) })}
      </p>
    </div>
  );
}

type MonetagShow = () => Promise<unknown>;

/** Monetag SDK: `show_<zoneId>()` resolves when the ad closes. Time is enforced server-side. */
function MonetagAd({
  config,
  onComplete,
  onUnavailable,
}: AdSlotProps & { config: Extract<AdClientConfig, { provider: "monetag" }> }) {
  const t = useTranslations("unlock");
  const callbacks = useLatest({ onComplete, onUnavailable });

  useEffect(() => {
    const fn = `show_${config.zoneId}`;
    loadScript(config.sdkUrl, { "data-zone": config.zoneId, "data-sdk": fn })
      .then(() => {
        const show = (window as unknown as Record<string, MonetagShow | undefined>)[fn];
        if (!show) throw new Error("sdk_missing");
        return show();
      })
      .then(() => callbacks.current.onComplete())
      .catch((error: unknown) =>
        callbacks.current.onUnavailable(error instanceof Error ? error.message : "no_fill"),
      );
  }, [config.zoneId, config.sdkUrl, callbacks]);

  return <AdPlaying label={t("adPlaying")} />;
}

interface ApplixirOptions {
  apiKey: string;
  injectionElementId: string;
  userId: string;
  adStatusCallbackFn: (status: { type: string }) => void;
  adErrorCallbackFn: (error: unknown) => void;
}

/** AppLixir rewarded video. `userId` is the unlock session id, echoed back in the server callback. */
function ApplixirAd({
  config,
  sessionId,
  onComplete,
  onUnavailable,
}: AdSlotProps & { config: Extract<AdClientConfig, { provider: "applixir" }> }) {
  const callbacks = useLatest({ onComplete, onUnavailable });
  const elementId = `applixir-${sessionId}`;

  useEffect(() => {
    let watched = false;
    let finished = false;
    const finish = (fn: () => void) => {
      if (finished) return;
      finished = true;
      fn();
    };
    loadScript(config.sdkUrl)
      .then(() => {
        const open = (
          window as unknown as { initializeAndOpenPlayer?: (o: ApplixirOptions) => void }
        ).initializeAndOpenPlayer;
        if (!open) throw new Error("sdk_missing");
        open({
          apiKey: config.apiKey,
          injectionElementId: elementId,
          userId: sessionId,
          adStatusCallbackFn: (status) => {
            if (status.type === "complete") watched = true;
            // `allAdsCompleted` also fires when no ad was available.
            if (status.type === "allAdsCompleted") {
              finish(() =>
                watched
                  ? callbacks.current.onComplete()
                  : callbacks.current.onUnavailable("no_fill"),
              );
            }
            if (
              status.type === "skipped" ||
              status.type === "manuallyEnded" ||
              status.type === "consentDeclined"
            ) {
              finish(() => callbacks.current.onUnavailable(status.type));
            }
          },
          adErrorCallbackFn: () => finish(() => callbacks.current.onUnavailable("ad_error")),
        });
      })
      .catch(() => finish(() => callbacks.current.onUnavailable("sdk_failed")));
  }, [config.sdkUrl, config.apiKey, elementId, sessionId, callbacks]);

  return <div id={elementId} className="min-h-[240px] w-full" />;
}

function AdPlaying({ label }: { label: string }) {
  return (
    <p
      className="flex items-center justify-center gap-2 py-8 text-sm text-slate-600 dark:text-slate-400"
      aria-live="polite"
    >
      <Spinner /> {label}
    </p>
  );
}

/** Renders the ad for whichever provider the server selected. */
export function AdSlot(props: AdSlotProps) {
  const { config } = props;
  switch (config.provider) {
    case "dev":
      return <DevAd {...props} config={config} />;
    case "monetag":
      return <MonetagAd {...props} config={config} />;
    case "applixir":
      return <ApplixirAd {...props} config={config} />;
  }
}
