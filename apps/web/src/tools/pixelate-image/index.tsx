"use client";

import type { DownloadableFile } from "@anytools/shared";
import {
  PIXELATE_ACCEPTED_TYPES,
  PIXELATE_MAX_FILE_BYTES,
  type PixelateImageOutput,
} from "@anytools/tools/schemas/pixelate-image";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { DownloadIcon, Spinner } from "@/components/icons";
import { ApiClientError } from "@/lib/api-client";
import { type ToolRunPhase, type ToolUIProps, UnlockCancelledError } from "../types";

type Mode = "pixelate" | "blur";

export default function PixelateImageUI({ run }: ToolUIProps) {
  const t = useTranslations("pixelateImage");
  const tTool = useTranslations("tool");
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("pixelate");
  const [intensity, setIntensity] = useState(50);
  const [phase, setPhase] = useState<ToolRunPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DownloadableFile | null>(null);

  // Release the previous preview's object URL whenever it changes or the tool unmounts.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function choose(selected: File | undefined) {
    setResult(null);
    setError(null);
    if (selected && !(PIXELATE_ACCEPTED_TYPES as readonly string[]).includes(selected.type))
      return setError(t("invalidType"));
    if (selected && selected.size > PIXELATE_MAX_FILE_BYTES) return setError(t("tooLarge"));
    setFile(selected ?? null);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function process(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError(t("noFile"));
    setError(null);
    setResult(null);
    try {
      const { files } = await run<PixelateImageOutput>(
        { input: { mode, intensity }, files: [file] },
        setPhase,
      );
      setResult(files[0] ?? null);
    } catch (err) {
      if (err instanceof UnlockCancelledError) return;
      if (err instanceof ApiClientError && err.code === "validation_failed") setError(err.message);
      else if (err instanceof ApiClientError && err.code === "rate_limited")
        setError(tTool("rateLimited"));
      else setError(tTool("error"));
    } finally {
      setPhase(null);
    }
  }

  const busy = phase !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={process} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor={`${id}-file`} className="label">
            {t("file")}
          </label>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              choose(e.dataTransfer.files[0]);
            }}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand-500 dark:border-slate-700"
          >
            <span className="btn-secondary pointer-events-none">{t("chooseFile")}</span>
            <span className="text-xs text-slate-500">{file ? file.name : t("fileHint")}</span>
            <input
              id={`${id}-file`}
              type="file"
              accept={PIXELATE_ACCEPTED_TYPES.join(",")}
              onChange={(e) => choose(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">{t("mode")}</legend>
          <div className="flex gap-2">
            {(["pixelate", "blur"] as const).map((value) => (
              <label
                key={value}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-checked:border-brand-600 has-checked:bg-brand-50 dark:border-slate-700 dark:has-checked:bg-brand-900/40"
              >
                <input
                  type="radio"
                  name={`${id}-mode`}
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="accent-brand-600"
                />
                {t(value)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor={`${id}-intensity`} className="label">
              {t("intensity")}
            </label>
            <span className="text-sm tabular-nums">{intensity}</span>
          </div>
          <input
            id={`${id}-intensity`}
            type="range"
            min={1}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy || !file}>
          {busy && <Spinner />}
          {phase === "queued"
            ? tTool("queued")
            : phase === "processing"
              ? tTool("processing")
              : t("process")}
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" aria-live="polite">
        {preview && (
          <figure className="space-y-2">
            <figcaption className="label">{t("original")}</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img
              src={preview}
              alt={t("original")}
              className="max-h-72 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
            />
          </figure>
        )}
        {result && (
          <figure className="space-y-2">
            <figcaption className="label">{t("result")}</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed result URL */}
            <img
              src={result.url}
              alt={t("result")}
              className="max-h-72 w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
            />
            <a href={result.url} download={result.filename} className="btn-primary w-full">
              <DownloadIcon /> {tTool("download")}
            </a>
            <p className="text-xs text-slate-500">{tTool("expiresNote")}</p>
          </figure>
        )}
      </div>
    </div>
  );
}
