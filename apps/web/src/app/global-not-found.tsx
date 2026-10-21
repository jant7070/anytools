import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 · Any Tools",
  robots: { index: false },
};

/** URLs that match no route at all (outside /es and /en). Bilingual because there is no locale. */
export default function GlobalNotFound() {
  return (
    <html lang="es">
      <body className="grid min-h-dvh place-items-center p-6">
        <main className="space-y-4 text-center">
          <h1 className="text-3xl font-bold">404</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Página no encontrada · <span lang="en">Page not found</span>
          </p>
          <p className="flex justify-center gap-3">
            <Link href="/es" className="btn-primary">
              Ir al inicio
            </Link>
            <Link href="/en" lang="en" className="btn-secondary">
              Go home
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
