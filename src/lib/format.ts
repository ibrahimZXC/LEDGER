import { useApp } from "@/lib/store";
import { translator, type Lang } from "@/lib/i18n";

export function useI18n() {
  const lang = useApp((s) => s.lang);
  return { lang, t: translator(lang), dir: (lang === "ar" ? "rtl" : "ltr") as "rtl" | "ltr" };
}

export function formatMoney(n: number, lang: Lang) {
  const v = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  return lang === "ar" ? `${sign}${v} ج.م` : `${sign}EGP ${v}`;
}

export function formatDate(iso: string, lang: Lang) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}
