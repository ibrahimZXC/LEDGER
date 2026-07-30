import type { Entity, Transaction, TransactionType } from "@/types";

/**
 * Effect of a transaction on the entity's net balance.
 * Positive => the entity owes us (receivable).
 * Negative => we owe the entity (payable).
 */
export function entityDelta(tx: Transaction): number {
  const total = tx.totalAmount;
  const paid = tx.amountPaid;
  switch (tx.type) {
    case "sale":
    case "sale_to_supplier":
      return total - paid;
    case "purchase":
      return -(total - paid);
    case "payment_in":
    case "supplier_payment_in":
      return -paid;
    case "payment_out":
      return paid;
    case "supplier_return":
      return total;
    case "customer_return":
    case "customer_discount":
      return -total;
    default:
      return 0;
  }
}

/** Effect on the cash vault. Positive => cash in. */
export function vaultDelta(tx: Transaction): number {
  switch (tx.type) {
    case "sale":
    case "sale_to_supplier":
    case "payment_in":
    case "supplier_payment_in":
    case "supplier_return":
      return tx.amountPaid;
    case "purchase":
    case "payment_out":
    case "customer_return":
      return -tx.amountPaid;
    default:
      return 0;
  }
}

export function entityBalance(entity: Entity, txs: Transaction[]): number {
  return txs
    .filter((t) => t.entityId === entity.id)
    .reduce((sum, t) => sum + entityDelta(t), entity.openingBalance);
}

/** Chronological ledger with a running balance. */
export function buildLedger(entity: Entity, txs: Transaction[]) {
  const sorted = txs
    .filter((t) => t.entityId === entity.id)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.ref ?? 0) - (b.ref ?? 0));

  let running = entity.openingBalance;
  return sorted.map((tx) => {
    running += entityDelta(tx);
    return { tx, running };
  });
}

export function isCashType(type: TransactionType): boolean {
  return type === "payment_in" || type === "payment_out" || type === "supplier_payment_in";
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
