"use client";

import type { UnlockStartResponse, UnlockStatusResponse } from "@anytools/shared";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { track } from "@/lib/analytics/tracker";
import { ApiClientError, apiFetch, postJson } from "@/lib/api-client";
import { unlockStore } from "@/lib/unlock/token-store";
import { CloseIcon, Spinner, UnlockIcon } from "../icons";
import { usePublicConfig } from "../providers";
import { AdSlot } from "./ad-slot";
import { Turnstile } from "./turnstile";

type Step =
  | { kind: "human" }
  | { kind: "starting" }
  | { kind: "ad"; session: UnlockStartResponse }
  | { kind: "verifying"; session: UnlockStartResponse; waitSeconds: number }
  | { kind: "success"; token: string }
  | { kind: "no_ad" }
  | { kind: "error"; messageKey: "failed" | "turnstileFailed" | "expiredSession" | "rateLimited" };

const VERIFY_TIMEOUT_MS = 120_000;

export interface UnlockDialogProps {
  toolSlug: string;
  toolName: string;
  onUnlocked: (token: string) => void;
  onClose: () => void;
}

/**
 * Unlock flow: Turnstile → `unlock/start` → ad → poll `unlock/:id/status` until the server issues
 * a token. The browser never decides that an ad was watched; it only shows it and asks.
 */
export function UnlockDialog({ toolSlug, toolName, onUnlocked, onClose }: UnlockDialogProps) {
  const t = useTranslations("unlock");
  const tTool = useTranslations("tool");
  const locale = useLocale();
  const { turnstileSiteKey } = usePublicConfig();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [step, setStep] = useState<Step>({ kind: "human" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const handleTurnstileToken = useCallback(
    async (turnstileToken: string) => {
      setStep({ kind: "starting" });
      try {
        const session = await postJson<UnlockStartResponse>("/api/unlock/start", {
          toolSlug,
          turnstileToken,
        });
        track({ type: "ad_requested", toolSlug, props: { provider: session.ad.provider } });
        setStep({ kind: "ad", session });
      } catch (error) {
        const code = error instanceof ApiClientError ? error.code : "";
        setStep({
          kind: "error",
          messageKey:
            code === "turnstile_failed"
              ? "turnstileFailed"
              : code === "rate_limited"
                ? "rateLimited"
                : "failed",
        });
      }
    },
    [toolSlug],
  );

  const session = step.kind === "ad" || step.kind === "verifying" ? step.session : null;

  const handleAdComplete = useCallback(() => {
    if (!session) return;
    track({ type: "ad_completed", toolSlug, props: { provider: session.ad.provider } });
    setStep({ kind: "verifying", session, waitSeconds: 0 });
  }, [session, toolSlug]);

  const handleUnavailable = useCallback(
    (reason: string) => {
      if (session)
        track({
          type: "ad_failed",
          toolSlug,
          props: { provider: session.ad.provider, reason: reason.slice(0, 120) },
        });
      setStep({ kind: "no_ad" });
    },
    [session, toolSlug],
  );

  // Poll the server until it verifies the ad (time-based providers) or the webhook arrives.
  const verifyingSessionId = step.kind === "verifying" ? step.session.sessionId : null;
  useEffect(() => {
    if (!verifyingSessionId || !session) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const poll = async () => {
      try {
        const status = await apiFetch<UnlockStatusResponse>(
          `/api/unlock/${verifyingSessionId}/status`,
        );
        if (cancelled) return;
        if (status.status === "verified") {
          unlockStore.set(toolSlug, status.token, Date.now() + status.expiresInMs);
          track({ type: "tool_unlocked", toolSlug });
          setStep({ kind: "success", token: status.token });
          return;
        }
        if (status.status === "expired")
          return setStep({ kind: "error", messageKey: "expiredSession" });
        if (Date.now() - startedAt > VERIFY_TIMEOUT_MS)
          return setStep({ kind: "error", messageKey: "failed" });
        setStep({ kind: "verifying", session, waitSeconds: Math.ceil(status.retryAfterMs / 1000) });
        timer = setTimeout(poll, Math.max(session.pollIntervalMs, 500));
      } catch {
        if (!cancelled) setStep({ kind: "error", messageKey: "failed" });
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `session` is stable for a given verifying session id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyingSessionId, toolSlug]);

  // Show the confirmation briefly, then hand the token back (separate effect so that leaving the
  // verifying step does not cancel it).
  const onUnlockedRef = useRef(onUnlocked);
  useEffect(() => {
    onUnlockedRef.current = onUnlocked;
  });
  const successToken = step.kind === "success" ? step.token : null;
  useEffect(() => {
    if (!successToken) return;
    const timer = setTimeout(() => onUnlockedRef.current(successToken), 900);
    return () => clearTimeout(timer);
  }, [successToken]);

  const retry = () => {
    setAttempt((a) => a + 1);
    setStep({ kind: "human" });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <h2 id={titleId} className="text-lg font-semibold">
            {t("title", { tool: toolName })}
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t("intro")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={t("close")}
        >
          <CloseIcon />
        </button>
      </div>

      <div className="space-y-4 p-5" aria-live="polite">
        {step.kind === "human" && (
          <>
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              {t("verifyingHuman")}
            </p>
            <Turnstile
              key={attempt}
              siteKey={turnstileSiteKey}
              language={locale}
              onToken={(token) => void handleTurnstileToken(token)}
              onError={() => setStep({ kind: "error", messageKey: "turnstileFailed" })}
            />
          </>
        )}

        {step.kind === "starting" && <Status icon={<Spinner />} text={t("starting")} />}

        {step.kind === "ad" && (
          <AdSlot
            config={step.session.ad}
            sessionId={step.session.sessionId}
            onComplete={handleAdComplete}
            onUnavailable={handleUnavailable}
          />
        )}

        {step.kind === "verifying" && (
          <Status
            icon={<Spinner />}
            text={
              step.waitSeconds > 1 ? t("waitServer", { seconds: step.waitSeconds }) : t("verifying")
            }
          />
        )}

        {step.kind === "success" && (
          <Status icon={<UnlockIcon className="text-emerald-600" />} text={t("success")} />
        )}

        {(step.kind === "no_ad" || step.kind === "error") && (
          <div className="space-y-4 text-center">
            <p className="text-sm">
              {step.kind === "no_ad"
                ? t("noAd")
                : step.messageKey === "rateLimited"
                  ? tTool("rateLimited")
                  : t(step.messageKey)}
            </p>
            <div className="flex justify-center gap-2">
              <button type="button" className="btn-primary" onClick={retry}>
                {t("retry")}
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                {t("close")}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

function Status({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center justify-center gap-2 py-6 text-sm">
      {icon}
      {text}
    </p>
  );
}
