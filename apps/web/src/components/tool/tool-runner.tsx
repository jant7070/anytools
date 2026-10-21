"use client";

import {
  type JobStatusResponse,
  type ToolRunMode,
  type ToolRunResponse,
  UNLOCK_TOKEN_TTL_SECONDS,
} from "@anytools/shared";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { track } from "@/lib/analytics/tracker";
import { ApiClientError, apiFetch } from "@/lib/api-client";
import { unlockStore } from "@/lib/unlock/token-store";
import { toolUIs } from "@/tools/registry";
import {
  type ToolRunPhase,
  type ToolRunRequest,
  type ToolRunResult,
  type ToolUIProps,
  UnlockCancelledError,
} from "@/tools/types";
import { LockIcon, UnlockIcon } from "../icons";
import { UnlockDialog } from "../unlock/unlock-dialog";

const JOB_POLL_MS = 1000;
const JOB_TIMEOUT_MS = 3 * 60_000;

function useNow(intervalMs: number, enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs, enabled]);
  return now;
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Hosts a tool UI: unlock status, the unlock dialog, and the API calls behind `run()`. */
export function ToolRunner({
  slug,
  name,
  runMode,
}: {
  slug: string;
  name: string;
  runMode: ToolRunMode;
}) {
  const t = useTranslations("tool");
  const [loaded, setLoaded] = useState<{ Component: ComponentType<ToolUIProps> } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);
  const pendingUnlock = useRef<{
    resolve: (token: string) => void;
    reject: (e: Error) => void;
  } | null>(null);

  const unlock = useSyncExternalStore(
    unlockStore.subscribe,
    () => unlockStore.peek(slug),
    () => null,
  );
  const now = useNow(1000, Boolean(unlock));
  const remaining = unlock ? Math.min(unlock.expiresAt - now, UNLOCK_TOKEN_TTL_SECONDS * 1000) : 0;
  const unlocked = Boolean(unlock) && remaining > 1000;

  useEffect(() => {
    track({ type: "tool_view", toolSlug: slug });
    const loader = toolUIs[slug];
    if (loader) void loader().then((mod) => setLoaded({ Component: mod.default }));
  }, [slug]);

  // When the 5-minute window ends, forget the token and tell the user why.
  useEffect(() => {
    if (!unlock) return;
    const timer = setTimeout(
      () => {
        unlockStore.clear(slug);
        setExpiredNotice(true);
      },
      Math.max(0, unlock.expiresAt - Date.now() - 1000),
    );
    return () => clearTimeout(timer);
  }, [unlock, slug]);

  // One shared in-flight unlock: concurrent runs wait for the same dialog.
  const inflightUnlock = useRef<Promise<string> | null>(null);
  const requestUnlock = useCallback(() => {
    const current = unlockStore.get(slug);
    if (current) return Promise.resolve(current.token);
    inflightUnlock.current ??= new Promise<string>((resolve, reject) => {
      pendingUnlock.current = { resolve, reject };
      setDialogOpen(true);
    }).finally(() => {
      inflightUnlock.current = null;
    });
    return inflightUnlock.current;
  }, [slug]);

  const execute = useCallback(
    async (
      token: string,
      request: ToolRunRequest,
      onPhase?: (phase: ToolRunPhase) => void,
    ): Promise<ToolRunResult> => {
      const authorization = `Bearer ${token}`;
      if (runMode === "sync") {
        onPhase?.("processing");
        const res = await apiFetch<ToolRunResponse>(`/api/tools/${slug}/run`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization },
          body: JSON.stringify(request.input ?? {}),
        });
        return { output: res.mode === "sync" ? res.result : null, files: [] };
      }

      const form = new FormData();
      form.set("input", JSON.stringify(request.input ?? {}));
      for (const file of request.files ?? []) form.append("file", file, file.name);
      onPhase?.("queued");
      const res = await apiFetch<ToolRunResponse>(`/api/tools/${slug}/run`, {
        method: "POST",
        headers: { authorization },
        body: form,
      });
      if (res.mode !== "queue") throw new Error("Unexpected response");

      const started = Date.now();
      while (Date.now() - started < JOB_TIMEOUT_MS) {
        await sleep(JOB_POLL_MS);
        const job = await apiFetch<JobStatusResponse>(`/api/jobs/${res.jobId}`);
        if (job.state === "active") onPhase?.("processing");
        if (job.state === "completed" && job.result)
          return { output: job.result.output, files: job.result.files };
        if (job.state === "failed")
          throw new ApiClientError(
            422,
            job.error?.code ?? "tool_failed",
            job.error?.message ?? "Tool failed",
          );
      }
      throw new ApiClientError(504, "tool_timeout", "The tool took too long");
    },
    [runMode, slug],
  );

  const run = useCallback(
    async (request: ToolRunRequest, onPhase?: (phase: ToolRunPhase) => void) => {
      try {
        if (!unlockStore.get(slug)) onPhase?.("unlocking");
        let token = await requestUnlock();
        // Measure the tool itself, not the time spent watching the ad.
        let started = performance.now();
        let result: ToolRunResult;
        try {
          result = await execute(token, request, onPhase);
        } catch (error) {
          // The server is the authority: if it says the unlock is gone, ask for a new ad once.
          if (!(error instanceof ApiClientError) || !error.code.startsWith("unlock_")) throw error;
          unlockStore.clear(slug);
          onPhase?.("unlocking");
          token = await requestUnlock();
          started = performance.now();
          result = await execute(token, request, onPhase);
        }
        track({
          type: "tool_used",
          toolSlug: slug,
          props: { durationMs: Math.round(performance.now() - started) },
        });
        return result;
      } catch (error) {
        if (!(error instanceof UnlockCancelledError)) {
          track({
            type: "tool_error",
            toolSlug: slug,
            props: { code: error instanceof ApiClientError ? error.code : "client_error" },
          });
        }
        throw error;
      }
    },
    [execute, requestUnlock, slug],
  ) as ToolUIProps["run"];

  const closeDialog = (token?: string) => {
    setDialogOpen(false);
    const pending = pendingUnlock.current;
    pendingUnlock.current = null;
    if (token) {
      setExpiredNotice(false);
      pending?.resolve(token);
    } else {
      pending?.reject(new UnlockCancelledError());
    }
  };

  const Component = loaded?.Component;
  return (
    <section className="card overflow-hidden" aria-label={name}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">
        {unlocked ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <UnlockIcon /> {t("unlocked")} ·{" "}
            <span className="tabular-nums">
              {t("timeLeft", { time: formatRemaining(remaining) })}
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            <LockIcon /> {t("locked")} · <span className="font-normal">{t("unlockHint")}</span>
          </p>
        )}
        {!unlocked && Component && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => void requestUnlock().catch(() => {})}
          >
            {t("unlockCta")}
          </button>
        )}
      </div>

      {expiredNotice && !unlocked && (
        <p
          role="status"
          className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {t("expired")}
        </p>
      )}

      {/* Tool inputs/results may contain sensitive data: exclude them from session recordings. */}
      <div className="ph-no-capture p-5" data-clarity-mask="true">
        {toolUIs[slug] ? (
          Component ? (
            <Component run={run} />
          ) : (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          )
        ) : (
          <p className="text-slate-600 dark:text-slate-400">{t("comingSoon")}</p>
        )}
      </div>

      {dialogOpen && (
        <UnlockDialog
          toolSlug={slug}
          toolName={name}
          onUnlocked={(token) => closeDialog(token)}
          onClose={() => closeDialog()}
        />
      )}
    </section>
  );
}
