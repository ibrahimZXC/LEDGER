import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, Upload, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TransactionDialog } from "@/components/dialogs";
import { CsvImportDialog } from "@/components/CsvImport";
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
import { buildLedger } from "@/lib/ledger";
import { statementSpec } from "@/lib/exporters";
import { cn } from "@/lib/utils";
import { TRANSACTION_TYPES, type EntityType } from "@/types";

export function EntityProfile({ id, type }: { id: string; type: EntityType }) {
  const { t, lang } = useI18n();
  const { entities, transactions, vaults, deleteTransaction } = useApp();
  const entity = entities.find((e) => e.id === id && e.type === type);
  const [newTx, setNewTx] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fullLedger = useMemo(
    () => (entity ? buildLedger(entity, transactions) : []),
    [entity, transactions],
  );

  const ledger = useMemo(() => {
    return fullLedger.filter((row) => {
      if (filterType !== "all" && row.tx.type !== filterType) return false;
      if (filterFrom && row.tx.date < filterFrom) return false;
      if (filterTo && row.tx.date > filterTo) return false;
      return true;
    });
  }, [fullLedger, filterType, filterFrom, filterTo]);

  if (!entity) {
    return (
      <AppShell title="—">
        <p className="text-xs text-muted-foreground">{t("noData")}</p>
      </AppShell>
    );
  }

  const balance = fullLedger.length ? fullLedger[fullLedger.length - 1].running : entity.openingBalance;

  return (
    <AppShell
      title={entity.name}
      action={
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setImporting(true)}
          >
            <Upload className="size-3.5" strokeWidth={1.75} />
            {t("importCsv")}
          </Button>
          <ExportMenu spec={() => statementSpec(entity, ledger, lang, t)} />
        </div>
      }
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Cell label={t("openingBalance")} value={formatMoney(entity.openingBalance, lang)} />
          <Cell
            label={t("balance")}
            value={formatMoney(balance, lang)}
            tone={balance > 0 ? "positive" : balance < 0 ? "negative" : undefined}
            big
          />
        </div>

        <section className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("accountStatement")}
            </h2>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setNewTx(true)}
              >
                <Plus className="size-3.5" strokeWidth={2} />
                {t("transactions")}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-accent/30 px-4 py-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {TRANSACTION_TYPES.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {t(ty)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="h-7 w-36 text-xs"
              aria-label={t("from")}
            />
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="h-7 w-36 text-xs"
              aria-label={t("to")}
            />
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground"
              title={t("resetFilters")}
              onClick={() => {
                setFilterType("all");
                setFilterFrom("");
                setFilterTo("");
              }}
            >
              <RotateCcw className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>

          {ledger.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <Th>{t("date")}</Th>
                    <Th>{t("type")}</Th>
                    <Th className="bg-accent/60">{t("quantity")}</Th>
                    <Th className="bg-accent/60">{t("unitPrice")}</Th>
                    <Th>{t("total")}</Th>
                    <Th>{t("paid")}</Th>
                    <Th>{t("vault")}</Th>
                    <Th>{t("balance")}</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(({ tx, running }) => (
                    <tr
                      key={tx.id}
                      className="border-b border-border last:border-0 hover:bg-accent/40"
                    >
                      <Td className="num text-muted-foreground">{formatDate(tx.date, lang)}</Td>
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
                          "num font-semibold",
                          running > 0 ? "text-positive" : running < 0 ? "text-negative" : "",
                        )}
                      >
                        {formatMoney(running, lang)}
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
                            onClick={() => deleteTransaction(tx.id)}
                          >
                            <Trash2 className="size-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {newTx && (
        <TransactionDialog
          open
          onOpenChange={() => setNewTx(false)}
          defaultEntityId={entity.id}
          defaultType={type === "customer" ? "sale" : "purchase"}
        />
      )}
      {editing && (
        <TransactionDialog open onOpenChange={() => setEditing(null)} transactionId={editing} />
      )}
      {importing && (
        <CsvImportDialog open onOpenChange={() => setImporting(false)} entity={entity} />
      )}
    </AppShell>
  );
}

function Cell({
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

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3.5 py-2 text-start font-normal ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-2 text-start ${className}`}>{children}</td>;
}