import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp, useTotals } from "@/lib/store";
import { formatMoney, useI18n } from "@/lib/format";
import { vaultDelta } from "@/lib/ledger";
import { monthName, periodRange, type PeriodPreset } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Business Ledger" },
      {
        name: "description",
        content:
          "Charts for sales, purchases, cash movement and your biggest customers and suppliers.",
      },
      { property: "og:title", content: "Analytics — Business Ledger" },
      {
        property: "og:description",
        content:
          "Charts for sales, purchases, cash movement and your biggest customers and suppliers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

const SALE_TYPES = ["sale", "sale_to_supplier"];
const BUY_TYPES = ["purchase"];

function Analytics() {
  const { t, lang } = useI18n();
  const { transactions, entities } = useApp();
  const { cash, receivables, payables } = useTotals();
  const [preset, setPreset] = useState<PeriodPreset>("year");
  const now = new Date();
  const range = periodRange(preset, now.getFullYear(), now.getMonth());

  const inRange = useMemo(
    () => transactions.filter((tx) => !range || (tx.date >= range.from && tx.date <= range.to)),
    [transactions, range?.from, range?.to],
  );

  const monthly = useMemo(() => {
    const map = new Map<
      string,
      { sales: number; purchases: number; collected: number; paidOut: number }
    >();
    for (const tx of inRange) {
      const key = tx.date.slice(0, 7);
      const cur = map.get(key) ?? { sales: 0, purchases: 0, collected: 0, paidOut: 0 };
      if (SALE_TYPES.includes(tx.type)) cur.sales += tx.totalAmount || 0;
      if (BUY_TYPES.includes(tx.type)) cur.purchases += tx.totalAmount || 0;
      const d = vaultDelta(tx);
      if (d > 0) cur.collected += d;
      else cur.paidOut += -d;
      map.set(key, cur);
    }
    return Array.from(map, ([key, v]) => ({
      key,
      label: `${monthName(lang, Number(key.slice(5, 7)) - 1).slice(0, 3)} ${key.slice(2, 4)}`,
      ...v,
    })).sort((a, b) => a.key.localeCompare(b.key));
  }, [inRange, lang]);

  const totalSales = monthly.reduce((a, m) => a + m.sales, 0);
  const totalPurchases = monthly.reduce((a, m) => a + m.purchases, 0);

  const top = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of inRange)
      map.set(tx.entityId, (map.get(tx.entityId) ?? 0) + (tx.totalAmount || 0));
    return Array.from(map, ([id, value]) => ({
      name: entities.find((e) => e.id === id)?.name ?? "—",
      value,
    }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [inRange, entities]);

  const split = [
    { name: t("receivables"), value: receivables, color: "var(--color-positive)" },
    { name: t("payables"), value: payables, color: "var(--color-negative)" },
  ].filter((s) => s.value > 0);

  const tooltip = {
    contentStyle: {
      fontSize: 11,
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      background: "var(--color-popover)",
      color: "var(--color-foreground)",
    },
  };
  const axis = {
    tick: { fontSize: 10, fill: "var(--color-muted-foreground)" },
    tickLine: false,
    axisLine: false,
  };

  return (
    <AppShell
      title={t("analytics")}
      action={
        <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTime")}</SelectItem>
            <SelectItem value="week">{t("thisWeek")}</SelectItem>
            <SelectItem value="month">{t("thisMonth")}</SelectItem>
            <SelectItem value="year">{t("thisYear")}</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label={t("sales")} value={formatMoney(totalSales, lang)} />
          <Stat label={t("purchases")} value={formatMoney(totalPurchases, lang)} />
          <Stat
            label={t("grossMargin")}
            value={formatMoney(totalSales - totalPurchases, lang)}
            tone={totalSales - totalPurchases >= 0 ? "positive" : "negative"}
          />
          <Stat label={t("cashOnHand")} value={formatMoney(cash, lang)} />
        </div>

        <Panel title={t("salesVsPurchases")}>
          {monthly.length === 0 ? (
            <Empty text={t("noData")} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" {...axis} />
                <YAxis width={52} {...axis} />
                <Tooltip {...tooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  maxBarSize={44}
                  isAnimationActive={false}
                  dataKey="sales"
                  name={t("sales")}
                  fill="var(--color-brand)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  maxBarSize={44}
                  isAnimationActive={false}
                  dataKey="purchases"
                  name={t("purchases")}
                  fill="var(--color-muted-foreground)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={t("moneyMovement")}>
            {monthly.length === 0 ? (
              <Empty text={t("noData")} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis width={52} {...axis} />
                  <Tooltip {...tooltip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="collected"
                    name={t("collected")}
                    stroke="var(--color-positive)"
                    strokeWidth={1.75}
                    dot={false}
                  />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="paidOut"
                    name={t("paidOut")}
                    stroke="var(--color-negative)"
                    strokeWidth={1.75}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title={t("receivablesVsPayables")}>
            {split.length === 0 ? (
              <Empty text={t("noData")} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={split}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {split.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>

        <Panel title={t("topParties")}>
          {top.length === 0 ? (
            <Empty text={t("noData")} />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, top.length * 34)}>
              <BarChart
                data={top}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" {...axis} />
                <YAxis type="category" dataKey="name" width={110} {...axis} />
                <Tooltip {...tooltip} />
                <Bar
                  maxBarSize={22}
                  isAnimationActive={false}
                  dataKey="value"
                  name={t("total")}
                  fill="var(--color-brand)"
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-12 text-center text-xs text-muted-foreground">{text}</p>;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tracking-tight num",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
