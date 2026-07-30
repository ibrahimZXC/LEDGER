import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ExportMenu } from "@/components/ExportMenu";
import { useApp } from "@/lib/store";
import { formatMoney, useI18n } from "@/lib/format";
import { entityBalance } from "@/lib/ledger";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/debts")({
  head: () => ({
    meta: [
      { title: "Debt Manager — Business Ledger" },
      {
        name: "description",
        content: "See who owes you and who you owe, sorted by outstanding balance.",
      },
      { property: "og:title", content: "Debt Manager — Business Ledger" },
      {
        property: "og:description",
        content: "See who owes you and who you owe, sorted by outstanding balance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Debts,
});

function Debts() {
  const { t, lang } = useI18n();
  const { entities, transactions } = useApp();
  const [tab, setTab] = useState<"in" | "out">("in");

  const all = entities
    .map((e) => ({ entity: e, balance: entityBalance(e, transactions) }))
    .filter((r) => r.balance !== 0);

  const owedToMe = all.filter((r) => r.balance > 0).reduce((s, r) => s + r.balance, 0);
  const iOwe = all.filter((r) => r.balance < 0).reduce((s, r) => s + -r.balance, 0);
  const net = owedToMe - iOwe;

  const rows = all
    .filter((r) => (tab === "in" ? r.balance > 0 : r.balance < 0))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  const total = rows.reduce((s, r) => s + Math.abs(r.balance), 0);

  const spec = () => ({
    title: t("debtsReport"),
    subtitle: t(tab === "in" ? "owesMe" : "iOwe"),
    meta: [
      { label: t("totalOwedToMe"), value: formatMoney(owedToMe, lang) },
      { label: t("totalIOwe"), value: formatMoney(iOwe, lang) },
      { label: t("netPosition"), value: formatMoney(net, lang) },
    ],
    headers: [t("entity"), t("type"), t("balance")],
    numeric: [2],
    rows: [
      ...rows.map(({ entity, balance }) => [
        entity.name,
        t(entity.type === "customer" ? "customer" : "supplier"),
        formatMoney(Math.abs(balance), lang),
      ]),
      [t("net"), "", formatMoney(total, lang)],
    ],
    lang,
    filename: "debts",
  });

  return (
    <AppShell title={t("debts")} action={<ExportMenu spec={spec} />}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label={t("totalOwedToMe")} value={formatMoney(owedToMe, lang)} tone="positive" />
          <Stat label={t("totalIOwe")} value={formatMoney(iOwe, lang)} tone="negative" />
          <Stat
            label={t("netPosition")}
            value={formatMoney(net, lang)}
            tone={net > 0 ? "positive" : net < 0 ? "negative" : undefined}
            big
          />
        </div>

        <div className="flex gap-1 panel p-1">
          {(["in", "out"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors",
                tab === k && "bg-muted font-medium text-foreground",
              )}
            >
              {t(k === "in" ? "owesMe" : "iOwe")}
            </button>
          ))}
        </div>

        <div className="panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">{t("net")}</span>
            <span className="font-medium tabular-nums">{formatMoney(total, lang)}</span>
          </div>
          {rows.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">{t("noData")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map(({ entity, balance }) => (
                <li key={entity.id}>
                  <Link
                    to={entity.type === "customer" ? "/customers/$id" : "/suppliers/$id"}
                    params={{ id: entity.id }}
                    className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{entity.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(entity.type === "customer" ? "customers" : "suppliers")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        balance > 0 ? "text-positive" : "text-negative",
                      )}
                    >
                      {formatMoney(Math.abs(balance), lang)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  big?: boolean;
}) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-semibold tracking-tight num",
          big ? "text-2xl" : "text-lg",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </p>
    </div>
  );
}
