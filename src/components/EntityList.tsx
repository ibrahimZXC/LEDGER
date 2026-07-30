import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EntityDialog } from "@/components/dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { formatMoney, useI18n } from "@/lib/format";
import { entityBalance } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import type { EntityType } from "@/types";

export function EntityList({ type }: { type: EntityType }) {
  const { t, lang } = useI18n();
  const { entities, transactions } = useApp();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const rows = entities
    .filter((e) => e.type === type && (e.name.includes(q) || e.phone.includes(q)))
    .map((e) => ({ entity: e, balance: entityBalance(e, transactions) }));

  return (
    <AppShell title={t(type === "customer" ? "customers" : "suppliers")}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3"
              strokeWidth={1.75}
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              className="h-9 ltr:pl-9 rtl:pr-9"
            />
          </div>
          <Button size="sm" className="h-9" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" strokeWidth={2} />
            {t(type === "customer" ? "addCustomer" : "addSupplier")}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="panel py-12 text-center text-xs text-muted-foreground">{t("noData")}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ entity, balance }) => (
              <Link
                key={entity.id}
                to={type === "customer" ? "/customers/$id" : "/suppliers/$id"}
                params={{ id: entity.id }}
                className="panel group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40"
              >
                <p className="truncate text-sm font-medium">{entity.name}</p>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {balance > 0 ? t("owesMe") : balance < 0 ? t("iOwe") : t("balance")}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xl font-semibold leading-none tracking-tight num",
                      balance > 0 && "text-positive",
                      balance < 0 && "text-negative",
                    )}
                  >
                    {formatMoney(Math.abs(balance), lang)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      {open && <EntityDialog open onOpenChange={setOpen} type={type} />}
    </AppShell>
  );
}
