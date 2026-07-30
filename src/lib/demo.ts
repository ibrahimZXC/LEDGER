import type { AppData, Entity, Transaction } from "@/types";
import { round2 } from "@/lib/ledger";

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
};

const entity = (
  id: string,
  name: string,
  type: Entity["type"],
  phone: string,
  openingBalance = 0,
): Entity => ({ id, name, type, phone, openingBalance, notes: "", createdAt: day(60) });

const tx = (
  id: string,
  date: string,
  entityId: string,
  entityType: Transaction["entityType"],
  type: Transaction["type"],
  quantity: number,
  unitPrice: number,
  amountPaid: number,
  vaultId = "",
): Transaction => {
  const totalAmount = round2(quantity * unitPrice) || amountPaid;
  return {
    id,
    date,
    entityId,
    entityType,
    type,
    vaultId,
    quantity,
    unitPrice,
    totalAmount,
    amountPaid,
    remainingBalance: round2(totalAmount - amountPaid),
    notes: "",
  };
};

export const DEMO_DATA: AppData = {
  vaults: [
    { id: "main", name: "Main Cash", balance: 5000 },
    { id: "bank", name: "Bank", balance: 12000 },
  ],
  entities: [
    entity("c1", "أحمد علي", "customer", "0100 111 2233", 500),
    entity("c2", "Mona Store", "customer", "0111 555 7788"),
    entity("c3", "سيد للتجارة", "customer", "0122 909 4141", -200),
    entity("s1", "Nile Traders", "supplier", "0100 777 8899"),
    entity("s2", "مصنع الدلتا", "supplier", "0128 303 1212", -1500),
  ],
  transactions: [
    tx("t1", day(28), "c1", "customer", "sale", 20, 45, 500, "main"),
    tx("t2", day(24), "c1", "customer", "payment_in", 0, 0, 300, "main"),
    tx("t3", day(21), "c2", "customer", "sale", 10, 130, 1300, "bank"),
    tx("t4", day(18), "c2", "customer", "sale", 6, 130, 0),
    tx("t5", day(16), "c3", "customer", "customer_return", 2, 45, 0),
    tx("t6", day(14), "s1", "supplier", "purchase", 40, 28, 700, "main"),
    tx("t7", day(12), "s1", "supplier", "payment_out", 0, 0, 300, "bank"),
    tx("t8", day(10), "s2", "supplier", "purchase", 15, 90, 0),
    tx("t9", day(7), "s2", "supplier", "sale_to_supplier", 5, 60, 300, "main"),
    tx("t10", day(5), "c1", "customer", "sale", 12, 45, 200, "main"),
    tx("t11", day(3), "c3", "customer", "sale", 8, 75, 600, "bank"),
    tx("t12", day(1), "c2", "customer", "payment_in", 0, 0, 500, "main"),
  ],
};
