"use client";

import {
  PASSWORD_MAX_COUNT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type PasswordGeneratorOutput,
} from "@anytools/tools/schemas/password-generator";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CopyIcon, Spinner } from "@/components/icons";
import { ApiClientError } from "@/lib/api-client";
import { type ToolUIProps, UnlockCancelledError } from "../types";

const CHARSETS = ["lowercase", "uppercase", "digits", "symbols"] as const;

function strengthKey(bits: number) {
  if (bits < 40) return "weak";
  if (bits < 60) return "fair";
  if (bits < 80) return "strong";
  return "veryStrong";
}

export default function PasswordGeneratorUI({ run }: ToolUIProps) {
  const t = useTranslations("passwordGenerator");
  const tTool = useTranslations("tool");
  const id = useId();
  const [options, setOptions] = useState({
    length: 16,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: false,
    excludeAmbiguous: false,
    count: 1,
  });
  const [result, setResult] = useState<PasswordGeneratorOutput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const noCharset = !CHARSETS.some((c) => options[c]);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (noCharset) return setError(t("atLeastOne"));
    setBusy(true);
    setError(null);
    try {
      const { output } = await run<PasswordGeneratorOutput>({ input: options });
      setResult(output);
      setCopied(null);
    } catch (err) {
      if (err instanceof UnlockCancelledError) return;
      setError(
        err instanceof ApiClientError && err.code === "rate_limited"
          ? tTool("rateLimited")
          : tTool("error"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy(password: string, index: number) {
    await navigator.clipboard.writeText(password);
    setCopied(index);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={generate} className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={`${id}-length`} className="label">
              {t("length")}
            </label>
            <input
              type="number"
              aria-label={t("length")}
              min={PASSWORD_MIN_LENGTH}
              max={PASSWORD_MAX_LENGTH}
              value={options.length}
              onChange={(e) =>
                setOptions({
                  ...options,
                  length: Math.min(
                    PASSWORD_MAX_LENGTH,
                    Math.max(PASSWORD_MIN_LENGTH, Number(e.target.value) || PASSWORD_MIN_LENGTH),
                  ),
                })
              }
              className="input w-20 text-center tabular-nums"
            />
          </div>
          <input
            id={`${id}-length`}
            type="range"
            min={PASSWORD_MIN_LENGTH}
            max={64}
            value={Math.min(options.length, 64)}
            onChange={(e) => setOptions({ ...options, length: Number(e.target.value) })}
            className="w-full accent-brand-600"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="sr-only">{t("result")}</legend>
          {[...CHARSETS, "excludeAmbiguous" as const].map((key) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                className="size-4 accent-brand-600"
              />
              {t(key)}
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-3">
          <label htmlFor={`${id}-count`} className="label">
            {t("count")}
          </label>
          <select
            id={`${id}-count`}
            value={options.count}
            onChange={(e) => setOptions({ ...options, count: Number(e.target.value) })}
            className="input w-24"
          >
            {Array.from({ length: PASSWORD_MAX_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy || noCharset}>
          {busy && <Spinner />}
          {t("generate")}
        </button>
      </form>

      <div aria-live="polite">
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t("result")}</h3>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {t(`strength.${strengthKey(result.entropyBits)}`)} ·{" "}
                {t("entropy", { bits: result.entropyBits })}
              </span>
            </div>
            <ul className="space-y-2">
              {result.passwords.map((password, index) => (
                <li
                  key={`${index}-${password}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  <code className="min-w-0 flex-1 font-mono text-sm break-all">{password}</code>
                  <button
                    type="button"
                    onClick={() => void copy(password, index)}
                    className="btn-secondary px-3 py-1.5"
                  >
                    <CopyIcon />
                    {copied === index ? t("copied") : t("copy")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
