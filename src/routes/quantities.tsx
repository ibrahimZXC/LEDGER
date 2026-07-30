import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ExportMenu } from "@/components/ExportMenu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { formatDate, formatMoney, useI18n } from "@/lib/format";
import { monthName, periodRange, yearOptions, type PeriodPreset } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quantities")({
  head: () => ({
    meta: [
      { title: "Quantities Taken — Business Ledger" },
      {
        name: "description",
        content: "Every quantity taken by customers and suppliers, filterable by date and party.",
      },
      { property: "og:title", content: "Quantities Taken — Business Ledger" },
      {
        property: "og:description",
        content: "Every quantity taken by customers and suppliers, filterable by date and party.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuantitiesPage,
});

function QuantitiesPage() {
  const { t, lang } = useI18n();
  const { transactions, entities } = useApp();
  const [side, setSide] = useState<"all" | "customer" | "supplier">("all");
  const [entityId, setEntityId] = useState("all");
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const years = useMemo(() => yearOptions(transactions.map((tx) => tx.date)), [transactions]);
  const range = periodRange(preset, year, month);
  const efFrom = range?.from ?? from;
  const efTo = range?.to ?? to;

  const rows = useMemo(() => {
    const map = new Map<string, { qty: number; value: number; count: number; last: string }>();
    for (const tx of transactions) {
      if (!(tx.quantity ?? 0)) continue;
      if (side !== "all" && tx.entityType !== side) continue;
      if (entityId !== "all" && tx.entityId !== entityId) continue;
      if (efFrom && tx.date < efFrom) continue;
      if (efTo && tx.date > efTo) continue;
      const cur = map.get(tx.entityId) ?? { qty: 0, value: 0, count: 0, last: "" };
      cur.qty += tx.quantity || 0;
      cur.value += tx.totalAmount || 0;
      cur.count += 1;
      if (tx.date > cur.last) cur.last = tx.date;
      map.set(tx.entityId, cur);
    }
    return Array.from(map, ([id, v]) => ({ entity: entities.find((e) => e.id === id), ...v }))
      .filter((r) => r.entity)
      .sort((a, b) => b.qty - a.qty);
  }, [transactions, entities, side, entityId, efFrom, efTo]);

  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  const totalValue = rows.reduce((a, r) => a + r.value, 0);
  const options = entities.filter((e) => (side === "all" ? true : e.type === side));

  const spec = () => ({
    title: t("quantitiesByParty"),
    subtitle: `${efFrom || "…"} → ${efTo || "…"}`,
    meta: [
      { label: t("totalQty"), value: String(totalQty) },
      { label: t("totalValue"), value: formatMoney(totalValue, lang) },
      { label: t("rows"), value: String(rows.length) },
    ],
    headers: [
      t("entity"),
      t("type"),
      t("quantity"),
      t("avgPrice"),
      t("totalValue"),
      t("entries"),
      t("lastEntry"),
    ],
    numeric: [2, 3, 4, 5],
    rows: rows.map((r) => [
      r.entity!.name,
      t(r.entity!.type === "customer" ? "customer" : "supplier"),
      String(r.qty),
      formatMoney(r.qty ? r.value / r.qty : 0, lang),
      formatMoney(r.value, lang),
      String(r.count),
      r.last ? formatDate(r.last, lang) : "—",
    ]),
    lang,
    filename: "quantities",
  });

  return (
    <AppShell title={t("quantitiesLog")} action={<ExportMenu spec={spec} />}>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label={t("totalQty")} value={String(totalQty)} big />
          <Stat label={t("totalValue")} value={formatMoney(totalValue, lang)} />
          <Stat label={t("rows")} value={String(rows.length)} />
        </div>

        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("filters")}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <Select
                value={side}
                onValueChange={(v) => {
                  setSide(v as typeof side);
                  setEntityId("all");
                }}
              >
                <SelectTrigger className="h-7 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allEntities")}</SelectItem>
                  <SelectItem value="customer">{t("customers")}</SelectItem>
                  <SelectItem value="supplier">{t("suppliers")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger className="h-7 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allParties")}</SelectItem>
                  {options.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTime")}</SelectItem>
                  <SelectItem value="week">{t("thisWeek")}</SelectItem>
                  <SelectItem value="month">{t("thisMonth")}</SelectItem>
                  <SelectItem value="year">{t("thisYear")}</SelectItem>
                  <SelectItem value="custom">{t("customRange")}</SelectItem>
                </SelectContent>
              </Select>
              {preset === "month" && (
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {monthName(lang, i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(preset === "month" || preset === "year") && (
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {preset === "custom" && (
                <>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-7 w-36 text-xs"
                    aria-label={t("from")}
                  />
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-7 w-36 text-xs"
                    aria-label={t("to")}
                  />
                </>
              )}
              <button
                className="p-1.5 text-muted-foreground hover:text-foreground"
                title={t("reset")}
                onClick={() => {
                  setSide("all");
                  setEntityId("all");
                  setPreset("all");
                  setFrom("");
                  setTo("");
                }}
              >
                <RotateCcw className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <Th>{t("entity")}</Th>
                    <Th>{t("type")}</Th>
                    <Th className="bg-accent/60">{t("quantity")}</Th>
                    <Th className="bg-accent/60">{t("avgPrice")}</Th>
                    <Th>{t("totalValue")}</Th>
                    <Th className="hidden sm:table-cell">{t("entries")}</Th>
                    <Th className="hidden sm:table-cell">{t("lastEntry")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const entity = r.entity!;
                    return (
                      <tr
                        key={entity.id}
                        className="border-b border-border last:border-0 hover:bg-accent/40"
                      >
                        <Td className="font-medium">
                          <Link
                            to={entity.type === "customer" ? "/customers/$id" : "/suppliers/$id"}
                            params={{ id: entity.id }}
                            className="hover:underline"
                          >
                            {entity.name}
                          </Link>
                        </Td>
                        <Td className="text-muted-foreground">{t(entity.type)}</Td>
                        <Td className="num bg-accent/60 font-semibold">{r.qty}</Td>
                        <Td className="num bg-accent/60 font-semibold">
                          {formatMoney(r.qty ? r.value / r.qty : 0, lang)}
                        </Td>
                        <Td className="num">{formatMoney(r.value, lang)}</Td>
                        <Td className="num hidden text-muted-foreground sm:table-cell">
                          {r.count}
                        </Td>
                        <Td className="num hidden text-muted-foreground sm:table-cell">
                          {r.last ? formatDate(r.last, lang) : "—"}
                        </Td>
                      </tr>
                    );
                  })}
                  <tr className="bg-accent/40">
                    <td className="px-3.5 py-2 font-medium" colSpan={2}>
                      {t("net")}
                    </td>
                    <td className="px-3.5 py-2 font-semibold num">{totalQty}</td>
                    <td />
                    <td className="px-3.5 py-2 font-semibold num">
                      {formatMoney(totalValue, lang)}
                    </td>
                    <td className="hidden sm:table-cell" colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold tracking-tight num", big ? "text-2xl" : "text-lg")}>
        {value}
      </p>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3.5 py-2 text-start font-normal ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-2 text-start ${className}`}>{children}</td>;
}
