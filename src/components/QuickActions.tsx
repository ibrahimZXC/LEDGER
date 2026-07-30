import { useState } from "react";
import {
  Plus,
  ShoppingCart,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
  UserPlus,
  Truck,
} from "lucide-react";
import { EntityDialog, TransactionDialog } from "@/components/dialogs";
import { useI18n } from "@/lib/format";
import type { TransactionType } from "@/types";

export function QuickActions() {
  const { t } = useI18n();
  const [tx, setTx] = useState<TransactionType | null>(null);
  const [entity, setEntity] = useState<"customer" | "supplier" | null>(null);

  const actions = [
    { key: "newSale", icon: ShoppingCart, run: () => setTx("sale") },
    { key: "newPurchase", icon: PackagePlus, run: () => setTx("purchase") },
    { key: "paymentIn", icon: ArrowDownLeft, run: () => setTx("payment_in") },
    { key: "paymentOut", icon: ArrowUpRight, run: () => setTx("payment_out") },
    { key: "addCustomer", icon: UserPlus, run: () => setEntity("customer") },
    { key: "addSupplier", icon: Truck, run: () => setEntity("supplier") },
  ];

  return (
    <section className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Plus className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
        <h2 className="text-xs font-medium tracking-tight">{t("quickActions")}</h2>
      </div>
      <div className="grid grid-cols-2 divide-border sm:grid-cols-3 lg:grid-cols-6 lg:divide-x rtl:lg:divide-x-reverse">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={a.run}
            className="flex items-center gap-2.5 px-4 py-4 text-start text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <a.icon className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="truncate text-xs">{t(a.key)}</span>
          </button>
        ))}
      </div>

      {tx && <TransactionDialog open onOpenChange={() => setTx(null)} defaultType={tx} />}
      {entity && <EntityDialog open onOpenChange={() => setEntity(null)} type={entity} />}
    </section>
  );
}
