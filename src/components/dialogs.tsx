import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/format";
import {
  TRANSACTION_TYPES,
  type EntityType,
  type Transaction,
  type TransactionType,
} from "@/types";
import { round2 } from "@/lib/ledger";

export function EntityDialog({
  open,
  onOpenChange,
  type,
  entityId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: EntityType;
  entityId?: string;
}) {
  const { t } = useI18n();
  const { entities, addEntity, updateEntity } = useApp();
  const existing = entities.find((e) => e.id === entityId);
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    phone: existing?.phone ?? "",
    openingBalance: String(existing?.openingBalance ?? 0),
    notes: existing?.notes ?? "",
  });

  function submit() {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      type,
      openingBalance: Number(form.openingBalance) || 0,
      notes: form.notes,
    };
    if (existing) updateEntity(existing.id, payload);
    else addEntity(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            {type === "customer" ? t("addCustomer") : t("addSupplier")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={t("name")}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label={t("phone")}>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label={t("openingBalance")}>
            <Input
              type="number"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </Field>
          <Field label={t("notes")}>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={submit}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransactionDialog({
  open,
  onOpenChange,
  defaultType = "sale",
  defaultEntityId,
  transactionId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: TransactionType;
  defaultEntityId?: string;
  transactionId?: string;
}) {
  const { t } = useI18n();
  const { entities, vaults, transactions, addTransaction, updateTransaction } = useApp();
  const existing = transactions.find((x) => x.id === transactionId);

  const [form, setForm] = useState({
    date: existing?.date ?? new Date().toISOString().slice(0, 10),
    type: existing?.type ?? defaultType,
    entityId: existing?.entityId ?? defaultEntityId ?? "",
    vaultId: existing?.vaultId || "none",
    quantity: String(existing?.quantity ?? 1),
    unitPrice: String(existing?.unitPrice ?? 0),
    amountPaid: String(existing?.amountPaid ?? 0),
    notes: existing?.notes ?? "",
  });

  const entityScope: EntityType =
    form.type.includes("supplier") || form.type === "purchase" ? "supplier" : "customer";
  const options = useMemo(
    () => entities.filter((e) => e.type === entityScope),
    [entities, entityScope],
  );

  const totalAmount = round2((Number(form.quantity) || 0) * (Number(form.unitPrice) || 0));
  const remaining = round2(totalAmount - (Number(form.amountPaid) || 0));

  function submit() {
    const entity = entities.find((e) => e.id === form.entityId);
    if (!entity) return;
    const payload: Omit<Transaction, "id"> = {
      date: form.date,
      type: form.type,
      entityType: entity.type,
      entityId: entity.id,
      vaultId: form.vaultId === "none" ? "" : form.vaultId,
      quantity: Number(form.quantity) || 0,
      unitPrice: Number(form.unitPrice) || 0,
      totalAmount,
      amountPaid: Number(form.amountPaid) || 0,
      remainingBalance: remaining,
      notes: form.notes,
    };
    if (existing) updateTransaction(existing.id, payload);
    else addTransaction(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">{t(form.type)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("type")}>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as TransactionType, entityId: "" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {t(ty)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("date")}>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
          <Field label={t("entity")}>
            <Select value={form.entityId} onValueChange={(v) => setForm({ ...form, entityId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {options.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("linkedPayment")}>
            <Select
              value={form.vaultId || "none"}
              onValueChange={(v) => setForm({ ...form, vaultId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noVault")}</SelectItem>
                {vaults.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("quantity")}>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
          <Field label={t("unitPrice")}>
            <Input
              type="number"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            />
          </Field>
          <Field label={t("paid")}>
            <Input
              type="number"
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
            />
          </Field>
          <Field label={t("notes")}>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border text-xs">
          <div className="bg-accent/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("quantity")} × {t("unitPrice")}
            </p>
            <p className="mt-0.5 font-semibold num">
              {form.quantity || 0} × {form.unitPrice || 0}
            </p>
          </div>
          <div className="bg-background px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("total")}
            </p>
            <p className="mt-0.5 font-semibold num">{totalAmount}</p>
          </div>
          <div className="bg-background px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("remaining")}
            </p>
            <p className="mt-0.5 font-semibold num">{remaining}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={submit}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
