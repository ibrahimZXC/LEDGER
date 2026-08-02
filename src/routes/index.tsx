import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { QuickActions } from "@/components/QuickActions";
import { ThemeToggle } from "@/components/ThemeToggle";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp, useTotals } from "@/lib/store";
import { formatDate, formatMoney, useI18n } from "@/lib/format";
import { entityDelta, vaultDelta } from "@/lib/ledger";
import { periodRange, type PeriodPreset } from "@/lib/period";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Business Ledger" },
      {
        name: "description",
        content: "Cash on hand, receivables and payables at a glance for your business.",
      },
      { property: "og:title", content: "Dashboard — Business Ledger" },
      {
        property: "og:description",
        content: "Cash on hand, receivables and payables at a glance for your business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang } = useI18n();
  const { cash, receivables, payables } = useTotals();
  const { transactions, entities } = useApp();

  const flow = buildFlow(transactions);
  const recent = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  return (
    <AppShell title={t("dashboard")} action={<ThemeToggle compact />}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label={t("cashOnHand")} value={formatMoney(cash, lang)} accent />
          <Metric
            label={t("receivables")}
            value={formatMoney(receivables, lang)}
            tone={receivables > 0 ? "positive" : undefined}
          />
          <Metric
            label={t("payables")}
            value={formatMoney(payables, lang)}
            tone={payables > 0 ? "negative" : undefined}
          />
        </div>

        <QuickActions />

        <div className="grid gap-4">
          <Panel title={t("cashFlow")}>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={flow} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-popover)",
                    color: "var(--color-foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="var(--color-brand)"
                  fill="url(#cashFill)"
                  strokeWidth={1.75}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <BalancesTable />
          <QuantitiesSummary />
        </div>

        <Panel
          title={t("recent")}
          action={
            <Link
              to="/transactions"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {t("viewAll")}
              <ArrowUpRight className="size-3" strokeWidth={2} />
            </Link>
          }
          flush
        >
          {recent.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">{t("noData")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((tx) => {
                const entity = entities.find((e) => e.id === tx.entityId);
                return (
                  <li key={tx.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{entity?.name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t(tx.type)} · {formatDate(tx.date, lang)}
                        {tx.quantity ? ` · ${tx.quantity} × ${tx.unitPrice}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold num">
                      {formatMoney(tx.totalAmount || tx.amountPaid, lang)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function BalancesTable() {
  const { t, lang } = useI18n();
  const { entities, transactions } = useApp();
  const [filter, setFilter] = useState<"all" | "owesMe" | "iOwe">("all");

  const rows = useMemo(() => {
    return entities
      .map((e) => ({
        entity: e,
        balance: transactions
          .filter((tx) => tx.entityId === e.id)
          .reduce((sum, tx) => sum + entityDelta(tx), e.openingBalance),
      }))
      .filter((r) => r.balance !== 0)
      .filter((r) =>
        filter === "all" ? true : filter === "owesMe" ? r.balance > 0 : r.balance < 0,
      )
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [entities, transactions, filter]);

  const total = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("receivablesVsPayables")}
        </h2>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="h-7 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allParties")}</SelectItem>
            <SelectItem value="owesMe">{t("owesMe")}</SelectItem>
            <SelectItem value="iOwe">{t("iOwe")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-start font-normal">{t("entity")}</th>
                <th className="px-4 py-2 text-start font-normal">{t("type")}</th>

                <th className="px-4 py-2 text-end font-normal">{t("balance")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ entity, balance }) => (
                <tr
                  key={entity.id}
                  className="border-b border-border last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-2 font-medium">
                    <Link
                      to={entity.type === "customer" ? "/customers/$id" : "/suppliers/$id"}
                      params={{ id: entity.id }}
                      className="hover:underline"
                    >
                      {entity.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {balance > 0 ? t("owesMe") : t("iOwe")}
                  </td>

                  <td
                    className={cn(
                      "px-4 py-2 text-end font-semibold num",
                      balance > 0 ? "text-positive" : "text-negative",
                    )}
                  >
                    {formatMoney(Math.abs(balance), lang)}
                  </td>
                </tr>
              ))}
              <tr className="bg-accent/40">
                <td className="px-4 py-2 font-medium" colSpan={2}>
                  {t("net")}
                </td>
                <td
                  className={cn(
                    "px-4 py-2 text-end font-semibold num",
                    total >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {formatMoney(total, lang)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function QuantitiesSummary() {
  const { t, lang } = useI18n();
  const { entities, transactions } = useApp();
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const now = new Date();
  const range = periodRange(preset, now.getFullYear(), now.getMonth());

  const rows = useMemo(() => {
    const map = new Map<string, { qty: number; value: number; count: number; last: string }>();
    for (const tx of transactions) {
      if (!(tx.quantity ?? 0)) continue;
      if (range && (tx.date < range.from || tx.date > range.to)) continue;
      const cur = map.get(tx.entityId) ?? { qty: 0, value: 0, count: 0, last: "" };
      cur.qty += tx.quantity || 0;
      cur.value += tx.totalAmount || 0;
      cur.count += 1;
      if (tx.date > cur.last) cur.last = tx.date;
      map.set(tx.entityId, cur);
    }
    return Array.from(map, ([id, v]) => ({ entity: entities.find((e) => e.id === id), ...v }))
      .filter((r) => r.entity)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [entities, transactions, range?.from, range?.to]);

  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  const totalValue = rows.reduce((a, r) => a + r.value, 0);

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("quantitiesSummary")}
        </h2>
        <div className="flex items-center gap-1.5">
          <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTime")}</SelectItem>
              <SelectItem value="week">{t("thisWeek")}</SelectItem>
              <SelectItem value="month">{t("thisMonth")}</SelectItem>
              <SelectItem value="year">{t("thisYear")}</SelectItem>
            </SelectContent>
          </Select>
          <Link
            to="/quantities"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {t("viewAll")}
            <ArrowUpRight className="size-3" strokeWidth={2} />
          </Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">{t("noData")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-start font-normal">{t("entity")}</th>
                <th className="px-4 py-2 text-end font-normal">{t("quantity")}</th>
                <th className="px-4 py-2 text-end font-normal">{t("totalValue")}</th>
                <th className="hidden px-4 py-2 text-end font-normal sm:table-cell">
                  {t("lastEntry")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.entity!.id}
                  className="border-b border-border last:border-0 hover:bg-accent/40"
                >
                  <td className="px-4 py-2 font-medium">
                    <Link
                      to={r.entity!.type === "customer" ? "/customers/$id" : "/suppliers/$id"}
                      params={{ id: r.entity!.id }}
                      className="hover:underline"
                    >
                      {r.entity!.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-end font-semibold num bg-accent/50">{r.qty}</td>
                  <td className="px-4 py-2 text-end num">{formatMoney(r.value, lang)}</td>
                  <td className="hidden px-4 py-2 text-end num text-muted-foreground sm:table-cell">
                    {r.last ? formatDate(r.last, lang) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="bg-accent/40">
                <td className="px-4 py-2 font-medium">{t("net")}</td>
                <td className="px-4 py-2 text-end font-semibold num">{totalQty}</td>
                <td className="px-4 py-2 text-end font-semibold num">
                  {formatMoney(totalValue, lang)}
                </td>
                <td className="hidden sm:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "positive" | "negative";
}) {
  return (
    <div className={cn("panel px-4 py-4", accent && "ring-1 ring-border")}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-[26px] font-semibold leading-none tracking-tight num",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  className,
  flush,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("panel", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className={flush ? "" : "p-3"}>{children}</div>
    </section>
  );
}

function buildFlow(transactions: ReturnType<typeof useApp.getState>["transactions"]) {
  const sorted = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map<string, number>();
  let running = 0;
  for (const tx of sorted) {
    running += vaultDelta(tx);
    byDate.set(tx.date, running);
  }
  if (byDate.size === 0) {
    return [{ date: "—", cash: 0 }];
  }
  return Array.from(byDate, ([date, cash]) => ({ date: date.slice(5), cash }));
}
