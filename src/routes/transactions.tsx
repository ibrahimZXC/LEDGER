import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TransactionDialog } from "@/components/dialogs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { formatDate, formatMoney, useI18n } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPES } from "@/types";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "All Transactions — Business Ledger" },
      {
        name: "description",
        content: "Master table of every sale, purchase and payment with filters and CSV import.",
      },
      { property: "og:title", content: "All Transactions — Business Ledger" },
      {
        property: "og:description",
        content: "Master table of every sale, purchase and payment with filters and CSV import.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { t, lang } = useI18n();
  const { transactions, entities, vaults, deleteTransactions } = useApp();
  const [type, setType] = useState("all");
  const [entityId, setEntityId] = useState("all");
  const [vaultId, setVaultId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      transactions
        .filter((tx) => type === "all" || tx.type === type)
        .filter((tx) => entityId === "all" || tx.entityId === entityId)
        .filter((tx) => vaultId === "all" || tx.vaultId === vaultId)
        .filter((tx) => !from || tx.date >= from)
        .filter((tx) => !to || tx.date <= to)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, type, entityId, vaultId, from, to],
  );

  return (
    <AppShell
      title={t("transactions")}
      action={
        <div className="flex items-center gap-1.5">
          <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" strokeWidth={2} />
            {t("newSale")}
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("type")}</SelectItem>
              {TRANSACTION_TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>
                  {t(ty)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entityId} onValueChange={setEntityId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("entity")}</SelectItem>
              {entities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vaultId} onValueChange={setVaultId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("vault")}</SelectItem>
              {vaults.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="h-8 text-xs"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            type="date"
            className="h-8 text-xs"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {selected.length > 0 && (
          <div className="flex items-center justify-between rounded-md border border-border px-4 py-2 text-xs">
            <span className="num">{selected.length}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              onClick={() => {
                deleteTransactions(selected);
                setSelected([]);
              }}
            >
              {t("delete")}
            </Button>
          </div>
        )}

        <div className="panel overflow-x-auto">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">{t("noData")}</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="w-9 px-3.5 py-2"></th>
                  <Th>{t("date")}</Th>
                  <Th>{t("entity")}</Th>
                  <Th>{t("type")}</Th>
                  <Th className="bg-accent/60">{t("quantity")}</Th>
                  <Th className="bg-accent/60">{t("unitPrice")}</Th>
                  <Th>{t("total")}</Th>
                  <Th>{t("paid")}</Th>
                  <Th>{t("vault")}</Th>
                  <Th>{t("remaining")}</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-border last:border-0 hover:bg-accent/40"
                  >
                    <td className="px-3.5 py-2">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-[var(--color-primary)]"
                        checked={selected.includes(tx.id)}
                        onChange={(e) =>
                          setSelected((s) =>
                            e.target.checked ? [...s, tx.id] : s.filter((x) => x !== tx.id),
                          )
                        }
                      />
                    </td>
                    <Td className="num text-muted-foreground">{formatDate(tx.date, lang)}</Td>
                    <Td className="font-medium">
                      {entities.find((e) => e.id === tx.entityId)?.name ?? "—"}
                    </Td>
                    <Td>{t(tx.type)}</Td>
                    <Td className="num bg-accent/60 font-semibold">{tx.quantity || "—"}</Td>
                    <Td className="num bg-accent/60 font-semibold">
                      {tx.unitPrice ? formatMoney(tx.unitPrice, lang) : "—"}
                    </Td>
                    <Td className="num">{formatMoney(tx.totalAmount, lang)}</Td>
                    <Td className="num">{formatMoney(tx.amountPaid, lang)}</Td>
                    <Td className="text-muted-foreground">
                      {vaults.find((v) => v.id === tx.vaultId)?.name ?? "—"}
                    </Td>
                    <Td
                      className={cn(
                        "num",
                        tx.remainingBalance ? "text-negative" : "text-muted-foreground",
                      )}
                    >
                      {formatMoney(tx.remainingBalance, lang)}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <button
                          className="p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing(tx.id)}
                        >
                          <Pencil className="size-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          className="p-1 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTransactions([tx.id])}
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {editing && (
        <TransactionDialog open onOpenChange={() => setEditing(null)} transactionId={editing} />
      )}
      {creating && <TransactionDialog open onOpenChange={() => setCreating(false)} />}
    </AppShell>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3.5 py-2 text-start font-normal ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-2 text-start ${className}`}>{children}</td>;
}
