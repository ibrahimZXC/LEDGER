import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight, RotateCcw, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TransactionDialog } from "@/components/dialogs";
import { ExportMenu } from "@/components/ExportMenu";
import { Button } from "@/components/ui/button";
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
import { vaultDelta } from "@/lib/ledger";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Cash Vault — Business Ledger" },
      {
        name: "description",
        content: "Track every cash vault, its live balance and all linked payments.",
      },
      { property: "og:title", content: "Cash Vault — Business Ledger" },
      {
        property: "og:description",
        content: "Track every cash vault, its live balance and all linked payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  const { t, lang } = useI18n();
  const { vaults, transactions, entities, addVault, updateVault, deleteVault, deleteTransaction } =
    useApp();
  const [name, setName] = useState("");
  const [tx, setTx] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [vaultId, setVaultId] = useState("all");
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const stats = useMemo(() => {
    const perVault = vaults.map((v) => {
      const rows = transactions.filter((x) => x.vaultId === v.id);
      const delta = rows.reduce((a, x) => a + vaultDelta(x), 0);
      return { vault: v, balance: v.balance + delta, count: rows.length };
    });

    const movements = transactions
      .filter((x) => x.vaultId && vaults.some((v) => v.id === x.vaultId))
      .filter((x) => (vaultId === "all" ? true : x.vaultId === vaultId))
      .filter((x) => (from ? x.date >= from : true))
      .filter((x) => (to ? x.date <= to : true))
      .filter((x) => (dir === "all" ? true : dir === "in" ? vaultDelta(x) >= 0 : vaultDelta(x) < 0))
      .sort((a, b) => b.date.localeCompare(a.date));

    const inflow = movements.reduce((a, x) => a + Math.max(vaultDelta(x), 0), 0);
    const outflow = movements.reduce((a, x) => a + Math.max(-vaultDelta(x), 0), 0);
    return {
      perVault,
      inflow,
      outflow,
      total: perVault.reduce((a, x) => a + x.balance, 0),
      movements,
    };
  }, [vaults, transactions, vaultId, dir, from, to]);

  const spec = () => ({
    title: t("cashVault"),
    subtitle: `${t("movementsReport")} · ${from || "…"} → ${to || "…"}`,
    meta: [
      { label: t("vaultBalance"), value: formatMoney(stats.total, lang) },
      { label: t("moneyIn"), value: formatMoney(stats.inflow, lang) },
      { label: t("moneyOut"), value: formatMoney(stats.outflow, lang) },
    ],
    headers: [t("date"), t("entity"), t("type"), t("vault"), t("amount")],
    numeric: [4],
    rows: stats.movements.map((m) => [
      formatDate(m.date, lang),
      entities.find((e) => e.id === m.entityId)?.name ?? "—",
      t(m.type),
      vaults.find((v) => v.id === m.vaultId)?.name ?? "—",
      `${vaultDelta(m) >= 0 ? "+" : "-"}${formatMoney(Math.abs(vaultDelta(m)), lang)}`,
    ]),
    lang,
    filename: "cash-vault",
  });

  return (
    <AppShell
      title={t("cashVault")}
      action={
        <div className="flex items-center gap-1.5">
          <ExportMenu spec={spec} />
          <Button size="sm" className="h-8 text-xs" onClick={() => setTx(true)}>
            <Plus className="size-3.5" strokeWidth={2} />
            {t("paymentIn")}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label={t("vaultBalance")} value={formatMoney(stats.total, lang)} big />
          <Stat label={t("moneyIn")} value={formatMoney(stats.inflow, lang)} tone="positive" />
          <Stat label={t("moneyOut")} value={formatMoney(stats.outflow, lang)} tone="negative" />
        </div>

        <section className="panel">
          <div className="border-b border-border px-4 py-2.5">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("vaults")}
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {stats.perVault.map(({ vault, balance, count }) => (
              <li key={vault.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <Input
                  value={vault.name}
                  onChange={(e) => updateVault(vault.id, { name: e.target.value })}
                  className="h-8 min-w-40 flex-1 border-transparent bg-transparent px-1 text-xs font-medium hover:border-border focus-visible:border-border"
                />
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {t("openingCash")}
                  <Input
                    type="number"
                    value={vault.balance}
                    onChange={(e) =>
                      updateVault(vault.id, { balance: Number(e.target.value) || 0 })
                    }
                    className="h-8 w-28 text-xs num"
                  />
                </label>
                <span className="w-28 text-end text-sm font-semibold num">
                  {formatMoney(balance, lang)}
                </span>
                <span className="w-10 text-end text-[11px] text-muted-foreground num">{count}</span>
                <button
                  className="p-1.5 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteVault(vault.id)}
                >
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-border p-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("addVault")}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                if (!name.trim()) return;
                addVault(name.trim());
                setName("");
              }}
            >
              <Plus className="size-3.5" strokeWidth={2} />
            </Button>
          </div>
        </section>

        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("movements")}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <Select value={vaultId} onValueChange={setVaultId}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allVaults")}</SelectItem>
                  {vaults.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dir} onValueChange={(v) => setDir(v as typeof dir)}>
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("direction")}</SelectItem>
                  <SelectItem value="in">{t("moneyIn")}</SelectItem>
                  <SelectItem value="out">{t("moneyOut")}</SelectItem>
                </SelectContent>
              </Select>
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
              <button
                className="p-1.5 text-muted-foreground hover:text-foreground"
                title={t("reset")}
                onClick={() => {
                  setVaultId("all");
                  setDir("all");
                  setFrom("");
                  setTo("");
                }}
              >
                <RotateCcw className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          {stats.movements.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">{t("noData")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.movements.slice(0, 100).map((m) => {
                const delta = vaultDelta(m);
                const inflow = delta >= 0;
                return (
                  <li key={m.id} className="group flex items-center gap-3 px-4 py-2.5">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full border border-border",
                        inflow ? "text-positive" : "text-negative",
                      )}
                    >
                      {inflow ? (
                        <ArrowDownLeft className="size-3.5" strokeWidth={2} />
                      ) : (
                        <ArrowUpRight className="size-3.5" strokeWidth={2} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {entities.find((e) => e.id === m.entityId)?.name ?? "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t(m.type)} · {formatDate(m.date, lang)} ·{" "}
                        {vaults.find((v) => v.id === m.vaultId)?.name}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold num",
                        inflow ? "text-positive" : "text-negative",
                      )}
                    >
                      {inflow ? "+" : "−"}
                      {formatMoney(Math.abs(delta), lang)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                        title={t("edit")}
                        onClick={() => setEditId(m.id)}
                      >
                        <Pencil className="size-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        className="p-1.5 text-muted-foreground hover:text-destructive"
                        title={t("delete")}
                        onClick={() => deleteTransaction(m.id)}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      {tx && <TransactionDialog open onOpenChange={() => setTx(false)} defaultType="payment_in" />}
      {editId && (
        <TransactionDialog
          key={editId}
          open
          onOpenChange={() => setEditId(null)}
          transactionId={editId}
        />
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  big,
  tone,
}: {
  label: string;
  value: string;
  big?: boolean;
  tone?: "positive" | "negative";
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
