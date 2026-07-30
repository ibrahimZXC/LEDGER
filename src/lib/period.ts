export type PeriodPreset = "all" | "week" | "month" | "year" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Saturday-start week (common in Egypt). */
function weekStart(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 1) % 7; // Sat = 0
  x.setDate(x.getDate() - day);
  return x;
}

export function periodRange(
  preset: PeriodPreset,
  year: number,
  month: number,
): { from: string; to: string } | null {
  const now = new Date();
  if (preset === "all" || preset === "custom") return null;
  if (preset === "week") {
    const s = weekStart(now);
    const e = new Date(s);
    e.setDate(e.getDate() + 6);
    return { from: iso(s), to: iso(e) };
  }
  if (preset === "month") {
    const s = new Date(year, month, 1);
    const e = new Date(year, month + 1, 0);
    return { from: iso(s), to: iso(e) };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function monthName(lang: string, i: number) {
  return (lang === "ar" ? MONTHS_AR : MONTHS_EN)[i];
}

export function yearOptions(dates: string[]) {
  const set = new Set<number>(dates.map((d) => Number(d.slice(0, 4))).filter(Boolean));
  set.add(new Date().getFullYear());
  return Array.from(set).sort((a, b) => b - a);
}
