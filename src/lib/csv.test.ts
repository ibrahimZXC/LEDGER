import { describe, expect, it } from "vitest";
import { parseTransactionsCsv } from "@/lib/csv";
import type { TransactionType } from "@/types";

const vaults = { "main cash": "main", bank: "bank" };

function parseOne(typeLabel: string, entityType: "customer" | "supplier" = "customer") {
  const csv = [
    "date,type,entity,entityType,quantity,unitPrice,amountPaid,vault,notes",
    `2026-01-05,${typeLabel},Test Party,${entityType},2,50,100,Main Cash,`,
  ].join("\n");
  return parseTransactionsCsv(csv, vaults)[0];
}

// label -> expected type, covering every customer & supplier transaction type
const CASES: Array<[string, TransactionType, "customer" | "supplier"]> = [
  ["sale", "sale", "customer"],
  ["Sale", "sale", "customer"],
  ["Sale Invoice", "sale", "customer"],
  ["بيع", "sale", "customer"],
  ["مبيعات", "sale", "customer"],

  ["purchase", "purchase", "supplier"],
  ["Purchase Invoice", "purchase", "supplier"],
  ["شراء", "purchase", "supplier"],
  ["مشتريات", "purchase", "supplier"],

  ["payment_in", "payment_in", "customer"],
  ["Payment In", "payment_in", "customer"],
  ["Payment Received", "payment_in", "customer"],
  ["تحصيل", "payment_in", "customer"],
  ["قبض من عميل", "payment_in", "customer"],

  ["payment_out", "payment_out", "supplier"],
  ["Payment Out", "payment_out", "supplier"],
  ["Payment Made", "payment_out", "supplier"],
  ["دفع", "payment_out", "supplier"],
  ["سداد لمورد", "payment_out", "supplier"],

  ["supplier_return", "supplier_return", "supplier"],
  ["Supplier Return", "supplier_return", "supplier"],
  ["Return to Supplier", "supplier_return", "supplier"],
  ["مردود مورد", "supplier_return", "supplier"],
  ["مرتجع مشتريات", "supplier_return", "supplier"],

  ["sale_to_supplier", "sale_to_supplier", "supplier"],
  ["Sale to Supplier", "sale_to_supplier", "supplier"],
  ["بيع لمورد", "sale_to_supplier", "supplier"],

  ["supplier_payment_in", "supplier_payment_in", "supplier"],
  ["Supplier Payment In", "supplier_payment_in", "supplier"],
  ["Payment from Supplier", "supplier_payment_in", "supplier"],
  ["Received from Supplier", "supplier_payment_in", "supplier"],
  ["تحصيل من مورد", "supplier_payment_in", "supplier"],
  ["المورد دفعلي", "supplier_payment_in", "supplier"],

  ["customer_return", "customer_return", "customer"],
  ["Customer Return", "customer_return", "customer"],
  ["Sales Return", "customer_return", "customer"],
  ["مردود عميل", "customer_return", "customer"],

  ["customer_discount", "customer_discount", "customer"],
  ["Customer Discount", "customer_discount", "customer"],
  ["خصم عميل", "customer_discount", "customer"],
];

describe("CSV transaction type import", () => {
  it.each(CASES)("imports %s as %s", (label, expected, entityType) => {
    const row = parseOne(label, entityType);
    expect(row.reason ?? "").toBe("");
    expect(row.ok).toBe(true);
    expect(row.tx?.type).toBe(expected);
  });

  it("handles messy labels: casing, underscores, punctuation, invisible chars", () => {
    for (const label of [
      "  SUPPLIER_PAYMENT_IN  ",
      "supplier-payment-in",
      "Type: Supplier Payment In (cash)",
      "Supplier\u200bPayment\u00a0In",
    ]) {
      expect(parseOne(label, "supplier").tx?.type).toBe("supplier_payment_in");
    }
  });

  it("computes totals and remaining balance", () => {
    const row = parseOne("sale");
    expect(row.tx).toMatchObject({
      quantity: 2,
      unitPrice: 50,
      totalAmount: 100,
      amountPaid: 100,
      remainingBalance: 0,
      vaultId: "main",
      date: "2026-01-05",
    });
  });

  it("flags unknown types instead of guessing", () => {
    const row = parseOne("blahblah");
    expect(row.ok).toBe(false);
    expect(row.reason).toContain("unknown type");
  });

  it("supports entity-scoped imports without entity/type columns", () => {
    const csv = [
      "date,type,quantity,unitPrice,amountPaid,vault,notes",
      "2026-01-07,Supplier Payment In,0,0,100,,from supplier",
    ].join("\n");
    const [row] = parseTransactionsCsv(csv, vaults, { name: "Nile Traders", type: "supplier" });
    expect(row.ok).toBe(true);
    expect(row.tx?.type).toBe("supplier_payment_in");
    expect(row.tx?.entityName).toBe("Nile Traders");
    expect(row.tx?.entityType).toBe("supplier");
  });
});

describe("date disambiguation", () => {
  const head = "no,date,type,entity,entityType,quantity,unitPrice,amountPaid,vault,notes";
  const parse = (dates: string[]) =>
    parseTransactionsCsv(
      [head, ...dates.map((d, i) => `${i + 1},${d},sale,A,customer,1,10,10,,`)].join("\n"),
      vaults,
    );

  it("uses day-first by default", () => {
    expect(parse(["5/2/2026", "2/5/2026"]).map((r) => r.tx?.date)).toEqual([
      "2026-02-05",
      "2026-05-02",
    ]);
  });

  it("switches the whole file to month-first when evidence says so", () => {
    // 1/15/2026 can only be month-first → 5/2/2026 must be May 2nd too
    expect(parse(["1/15/2026", "5/2/2026"]).map((r) => r.tx?.date)).toEqual([
      "2026-01-15",
      "2026-05-02",
    ]);
  });

  it("stays day-first when evidence says day-first", () => {
    expect(parse(["15/1/2026", "5/2/2026"]).map((r) => r.tx?.date)).toEqual([
      "2026-01-15",
      "2026-02-05",
    ]);
  });

  it("keeps unambiguous formats untouched", () => {
    expect(parse(["2026-03-09", "20260310", "Mar 11 2026"]).map((r) => r.tx?.date)).toEqual([
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
    ]);
  });
});

describe("transaction numbers", () => {
  const rows = [
    "no,date,type,entity,entityType,quantity,unitPrice,amountPaid,vault,notes",
    "3,2026-01-05,sale,A,customer,1,10,10,,third",
    "1,2026-01-05,sale,A,customer,1,10,10,,first",
    "2,2026-01-05,sale,A,customer,1,10,10,,second",
  ].join("\n");

  it("reads the no column into ref", () => {
    expect(parseTransactionsCsv(rows, vaults).map((r) => r.ref)).toEqual([3, 1, 2]);
    expect(parseTransactionsCsv(rows, vaults).map((r) => r.tx?.ref)).toEqual([3, 1, 2]);
  });

  it("sorting by ref restores the intended order", () => {
    const sorted = parseTransactionsCsv(rows, vaults).sort((a, b) => a.ref - b.ref);
    expect(sorted.map((r) => r.tx?.notes)).toEqual(["first", "second", "third"]);
  });

  it("falls back to file order when no number column exists", () => {
    const csv = [
      "date,type,entity,entityType,quantity,unitPrice,amountPaid",
      "2026-01-05,sale,A,customer,1,10,10",
      "2026-01-05,sale,A,customer,1,10,10",
    ].join("\n");
    expect(parseTransactionsCsv(csv, vaults).map((r) => r.ref)).toEqual([1, 2]);
  });

  it("accepts arabic header رقم", () => {
    const csv = [
      "رقم,date,type,entity,entityType,amountPaid",
      "7,2026-01-05,sale,A,customer,10",
    ].join("\n");
    expect(parseTransactionsCsv(csv, vaults)[0].ref).toBe(7);
  });
});
