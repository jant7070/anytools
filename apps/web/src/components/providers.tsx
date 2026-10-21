"use client";

import type { Locale } from "@anytools/shared";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { addForwarder, track } from "@/lib/analytics/tracker";
import type { PublicConfig } from "@/lib/env";
import { usePathname } from "@/i18n/navigation";

const PublicConfigContext = createContext<PublicConfig | null>(null);

export function usePublicConfig(): PublicConfig {
  const config = useContext(PublicConfigContext);
  if (!config) throw new Error("usePublicConfig must be used inside <Providers>");
  return config;
}

/** Records a first-party `page_view` on every client-side navigation. */
function PageViewTracker({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  useEffect(() => {
    track({
      type: "page_view",
      props: { path: `/${locale}${pathname === "/" ? "" : pathname}`.slice(0, 300), locale },
    });
  }, [pathname, locale]);
  return null;
}

/** Loads PostHog only when a key is configured. Inputs are always masked in recordings. */
function PostHogLoader({ config }: { config: NonNullable<PublicConfig["posthog"]> }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let removeForwarder: (() => void) | undefined;
    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(config.key, {
        api_host: config.host,
        person_profiles: "identified_only",
        capture_pageview: "history_change",
        mask_all_text: false,
        session_recording: { maskAllInputs: true },
      });
      removeForwarder = addForwarder(({ type, ...rest }) => posthog.capture(type, rest));
    });
    return () => removeForwarder?.();
  }, [config]);
  return null;
}

/** Loads Microsoft Clarity (official snippet) only when a project id is configured. */
function ClarityLoader({ projectId }: { projectId: string }) {
  useEffect(() => {
    if (document.getElementById("clarity-script")) return;
    type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };
    const w = window as unknown as { clarity?: ClarityFn };
    w.clarity ??= Object.assign((...args: unknown[]) => void (w.clarity!.q ??= []).push(args), {
      q: [],
    });
    const script = document.createElement("script");
    script.id = "clarity-script";
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`;
    document.head.appendChild(script);
  }, [projectId]);
  return null;
}

export function Providers({
  config,
  locale,
  children,
}: {
  config: PublicConfig;
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <PublicConfigContext.Provider value={config}>
      <PageViewTracker locale={locale} />
      {config.posthog && <PostHogLoader config={config.posthog} />}
      {config.clarityProjectId && <ClarityLoader projectId={config.clarityProjectId} />}
      {children}
    </PublicConfigContext.Provider>
  );
}
