import { useMemo, useState } from "react";
import { FileDown, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/format";
import {
  CSV_TEMPLATE,
  ENTITY_CSV_TEMPLATE,
  downloadText,
  parseTransactionsCsv,
  type ParsedRow,
} from "@/lib/csv";
import type { Entity } from "@/types";
import { cn } from "@/lib/utils";

export function CsvImportDialog({
  open,
  onOpenChange,
  entity: scoped,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity?: Entity;
}) {
  const { t } = useI18n();
  const { vaults, entities, addEntity, addTransaction } = useApp();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const vaultByName = useMemo(
    () => Object.fromEntries(vaults.map((v) => [v.name.toLowerCase(), v.id])),
    [vaults],
  );

  const valid = rows.filter((r) => r.ok);
  const invalid = rows.filter((r) => !r.ok);

  async function onFile(file: File) {
    setFileName(file.name);
    setRows(
      parseTransactionsCsv(
        await file.text(),
        vaultByName,
        scoped ? { name: scoped.name, type: scoped.type } : undefined,
      ),
    );
  }

  function commit() {
    const ordered = [...valid].sort((a, b) => a.ref - b.ref);
    for (const row of ordered) {
      const data = row.tx!;
      const existing =
        scoped ??
        entities.find(
          (e) =>
            e.type === data.entityType &&
            e.name.trim().toLowerCase() === data.entityName.toLowerCase(),
        );
      const entity =
        existing ??
        addEntity({
          name: data.entityName,
          phone: "",
          type: data.entityType,
          openingBalance: 0,
          notes: "",
        });
      const { entityName: _n, ...tx } = data;
      addTransaction({ ...tx, entityId: entity.id });
    }
    setRows([]);
    setFileName("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            {t("importCsv")}
            {scoped ? ` — ${scoped.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() =>
              downloadText("transactions-template.csv", scoped ? ENTITY_CSV_TEMPLATE : CSV_TEMPLATE)
            }
          >
            <FileDown className="size-3.5" strokeWidth={1.75} />
            {t("template")}
          </Button>
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-xs hover:bg-accent">
            <Upload className="size-3.5" strokeWidth={1.75} />
            {fileName || "CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {rows.length > 0 && (
            <span className="text-xs text-muted-foreground num">
              {valid.length} ✓ · {invalid.length} {t("invalidRows")}
            </span>
          )}
        </div>

        {rows.length > 0 && (
          <div className="max-h-80 overflow-auto rounded-md border border-border">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-panel text-muted-foreground">
                <tr className="border-b border-border">
                  {[
                    "",
                    "#",
                    t("date"),
                    t("type"),
                    t("entity"),
                    t("quantity"),
                    t("unitPrice"),
                    t("paid"),
                    t("vault"),
                    "",
                  ].map((h, i) => (
                    <th key={i} className="px-2.5 py-1.5 text-start font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className={cn("border-b border-border last:border-0", !r.ok && "opacity-70")}
                  >
                    <td className="px-2.5 py-1.5">
                      {r.ok ? (
                        "✓"
                      ) : (
                        <span className="text-destructive" title={r.reason}>
                          ✕
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 num text-muted-foreground">{r.ref}</td>
                    <td className="px-2.5 py-1.5 num">{r.raw.date}</td>
                    <td className="px-2.5 py-1.5">{r.raw.type}</td>
                    <td className="px-2.5 py-1.5">{r.raw.entity}</td>
                    <td className="px-2.5 py-1.5 num">{r.raw.quantity}</td>
                    <td className="px-2.5 py-1.5 num">{r.raw.unitPrice}</td>
                    <td className="px-2.5 py-1.5 num">{r.raw.amountPaid}</td>
                    <td className="px-2.5 py-1.5">{r.raw.vault}</td>
                    <td className="px-2.5 py-1.5 text-destructive">{r.ok ? "" : r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button size="sm" disabled={valid.length === 0} onClick={commit}>
            {t("importRows")} ({valid.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
