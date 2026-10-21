import ReactMarkdown, { type Components } from "react-markdown";

// Raw HTML in the markdown is not rendered (react-markdown escapes it by default).
const components: Components = {
  h2: ({ children }) => <h2 className="mt-8 mb-3 text-xl font-bold tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-lg font-semibold">{children}</h3>,
  p: ({ children }) => (
    <p className="my-3 leading-relaxed text-slate-700 dark:text-slate-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-6 text-slate-700 dark:text-slate-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6 text-slate-700 dark:text-slate-300">
      {children}
    </ol>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="font-medium text-brand-600 underline underline-offset-2"
      rel="noopener"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm dark:bg-slate-800">
      {children}
    </code>
  ),
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
