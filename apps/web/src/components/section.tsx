import type { ReactNode } from "react";

export function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 id={`${id}-title`} className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        {hint && <span className="text-sm text-slate-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
