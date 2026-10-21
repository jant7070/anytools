import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="space-y-4 py-20 text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-slate-600 dark:text-slate-400">{t("body")}</p>
      <Link href="/" className="btn-primary">
        {t("back")}
      </Link>
    </div>
  );
}
