import Papa from "papaparse";
import { TRANSACTION_TYPES, type Transaction, type TransactionType } from "@/types";
import { dictionaries } from "@/lib/i18n";
import { round2 } from "@/lib/ledger";

export const CSV_COLUMNS = [
  "no",
  "date",
  "type",
  "entity",
  "entityType",
  "quantity",
  "unitPrice",
  "amountPaid",
  "vault",
  "notes",
] as const;

export const CSV_TEMPLATE = [
  CSV_COLUMNS.join(","),
  "1,2026-01-05,sale,Ahmed Ali,customer,10,25,150,Main Cash,first invoice",
  "2,2026-01-06,purchase,Nile Traders,supplier,4,120,480,Main Cash,",
  "3,2026-01-07,payment_in,Ahmed Ali,customer,0,0,100,Main Cash,cash collection",
].join("\n");

export interface ParsedRow {
  ok: boolean;
  reason?: string;
  raw: Record<string, string>;
  /** import order number (from the `no` column, else file order) */
  ref: number;
  tx?: Omit<Transaction, "id" | "entityId"> & { entityName: string };
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const ENTITY_CSV_TEMPLATE = [
  ["no", "date", "type", "quantity", "unitPrice", "amountPaid", "vault", "notes"].join(","),
  "1,2026-01-05,sale,10,25,150,Main Cash,first invoice",
  "2,2026-01-07,payment_in,0,0,100,,cash collection",
].join("\n");

/** loose key: lowercase, strip diacritics/invisible chars/punctuation, normalize arabic letters */
function typeKey(s: string) {
  return (
    s
      .normalize("NFKC")
      .toLowerCase()
      // invisible / zero-width / bidi marks + nbsp
      .replace(/[\u00A0\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ")
      .replace(/[\u064B-\u0652\u0640]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      // keep only letters + digits (latin + arabic)
      .replace(/[^a-z0-9\u0621-\u064A]+/g, "")
  );
}

const TYPE_ALIASES: Record<string, TransactionType> = {};
function alias(type: TransactionType, ...labels: string[]) {
  for (const l of labels) {
    const k = typeKey(l);
    if (k) TYPE_ALIASES[k] = type;
  }
}

// canonical keys + every UI label (EN + AR) from the transaction dialogs
for (const t of TRANSACTION_TYPES) alias(t, t, dictionaries.en[t] ?? "", dictionaries.ar[t] ?? "");

alias(
  "sale",
  "sale",
  "sales",
  "invoice",
  "sell",
  "sale invoice",
  "sold",
  "بيع",
  "مبيعات",
  "فاتورة بيع",
  "مبيع",
);
alias(
  "purchase",
  "purchase",
  "buy",
  "buying",
  "purchases",
  "purchase invoice",
  "bought",
  "شراء",
  "مشتريات",
  "فاتورة شراء",
  "توريد",
);
alias(
  "payment_in",
  "payment in",
  "paymentin",
  "payment received",
  "received payment",
  "receipt",
  "collection",
  "collect",
  "in",
  "cash in",
  "money in",
  "credit",
  "تحصيل",
  "قبض",
  "دفعة واردة",
  "مقبوضات",
  "استلام نقدية",
  "دفعه واردة",
  "قبض من عميل",
  "تحصيل من عميل",
  "دفعة من عميل",
);
alias(
  "payment_out",
  "payment out",
  "paymentout",
  "payment made",
  "paid",
  "pay",
  "out",
  "cash out",
  "money out",
  "debit",
  "دفع",
  "صرف",
  "دفعة صادرة",
  "مدفوعات",
  "دفع لمورد",
  "سداد",
  "سداد لمورد",
  "دفعة لمورد",
);
alias(
  "supplier_return",
  "supplier return",
  "return to supplier",
  "returns to supplier",
  "purchase return",
  "purchase returns",
  "return supplier",
  "مردود مورد",
  "مرتجع مورد",
  "مرتجع مشتريات",
  "مردود مشتريات",
  "رد لمورد",
);
alias(
  "sale_to_supplier",
  "sale to supplier",
  "sell to supplier",
  "sales to supplier",
  "supplier sale",
  "بيع لمورد",
  "بيع الي مورد",
  "مبيعات لمورد",
  "بيع للمورد",
);
alias(
  "supplier_payment_in",
  "supplier payment in",
  "supplier payment",
  "payment in from supplier",
  "payment from supplier",
  "received from supplier",
  "receipt from supplier",
  "collect from supplier",
  "collection from supplier",
  "supplier paid me",
  "supplier refund",
  "refund from supplier",
  "تحصيل من مورد",
  "قبض من مورد",
  "المورد دفعلي",
  "المورد دفع لي",
  "استرداد من مورد",
  "دفعة من مورد",
  "فلوس من مورد",
);
alias(
  "customer_return",
  "customer return",
  "return from customer",
  "returns from customer",
  "sales return",
  "sale return",
  "sales returns",
  "مردود عميل",
  "مرتجع عميل",
  "مرتجع مبيعات",
  "مردود مبيعات",
  "رد من عميل",
);
alias(
  "customer_discount",
  "customer discount",
  "discount",
  "discount to customer",
  "rebate",
  "allowance",
  "خصم عميل",
  "خصم",
  "خصم للعميل",
  "تخفيض",
);

/**
 * Resolve a free-text type label to a TransactionType.
 * 1) exact alias · 2) alias contained in text · 3) keyword heuristics (entity-aware)
 */
function resolveType(
  input: string,
  entityType: "customer" | "supplier",
): TransactionType | undefined {
  const k = typeKey(input);
  if (!k) return undefined;
  if (TYPE_ALIASES[k]) return TYPE_ALIASES[k];

  // longest alias that appears inside the value (handles "Type: Supplier Payment In (cash)")
  let best: TransactionType | undefined;
  let bestLen = 0;
  for (const [aliasKey, type] of Object.entries(TYPE_ALIASES)) {
    if (aliasKey.length > 2 && aliasKey.length > bestLen && k.includes(aliasKey)) {
      best = type;
      bestLen = aliasKey.length;
    }
  }
  if (best) return best;

  // keyword heuristics
  const has = (...w: string[]) => w.some((x) => k.includes(typeKey(x)));
  const supplier = has("supplier", "مورد", "vendor");
  const customer = has("customer", "client", "عميل", "زبون");
  const target: "customer" | "supplier" = supplier
    ? "supplier"
    : customer
      ? "customer"
      : entityType;

  if (has("discount", "خصم", "تخفيض")) return "customer_discount";
  if (has("return", "refund", "مرتجع", "مردود", "استرداد", "رد")) {
    return target === "supplier" ? "supplier_return" : "customer_return";
  }
  if (has("sale", "sell", "sold", "invoice", "بيع", "مبيعات", "فاتوره")) {
    return target === "supplier" ? "sale_to_supplier" : "sale";
  }
  if (has("purchase", "buy", "bought", "شراء", "مشتريات", "توريد")) return "purchase";

  const inward = has("in", "receiv", "collect", "تحصيل", "قبض", "وارد", "مقبوض");
  const outward = has("out", "paid", "pay", "دفع", "صرف", "سداد", "صادر", "مدفوع");
  if (has("payment", "cash", "money", "amount", "دفعه", "نقدي", "فلوس") || inward || outward) {
    if (inward && !outward) return target === "supplier" ? "supplier_payment_in" : "payment_in";
    if (outward) return "payment_out";
  }
  return undefined;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
  يناير: 1,
  فبراير: 2,
  مارس: 3,
  أبريل: 4,
  ابريل: 4,
  مايو: 5,
  يونيو: 6,
  يوليو: 7,
  أغسطس: 8,
  اغسطس: 8,
  سبتمبر: 9,
  أكتوبر: 10,
  اكتوبر: 10,
  نوفمبر: 11,
  ديسمبر: 12,
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const validYmd = (y: number, m: number, d: number) =>
  y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31;

export type DateOrder = "dmy" | "mdy";

/** strip noise, arabic digits, weekday prefix, time part */
function cleanDate(input: string): string {
  let v = input.trim();
  if (!v) return "";
  v = v.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٫،]/g, "/");
  v = v.replace(/[T\s]+\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\s*(am|pm|Z|[+-]\d{2}:?\d{2})?$/i, "").trim();
  return v.replace(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*[,\s]+/i, "").trim();
}

/** numeric d/m/y parts of a slash-style date, or null */
function numericParts(v: string): [number, number, number, number] | null {
  const p = v.split(/[-/.\s]+/).filter(Boolean);
  if (p.length !== 3 || p.some((x) => !/^\d+$/.test(x))) return null;
  const [a, b, c] = p.map(Number);
  if (p[0].length === 4) return null; // year-first, unambiguous
  let y = c;
  if (p[2].length <= 2) y += y < 100 ? 2000 : 0;
  return [a, b, y, p[0].length];
}

/**
 * Inspect every date in the file and decide whether ambiguous values like
 * 5/2/2026 are day-first or month-first. Evidence comes from rows where one
 * component is > 12 (e.g. 15/1/2026 → day-first, 1/15/2026 → month-first).
 * Defaults to day-first when the file gives no clue.
 */
export function detectDateOrder(values: string[]): DateOrder {
  let dmy = 0;
  let mdy = 0;
  for (const raw of values) {
    const parts = numericParts(cleanDate(raw));
    if (!parts) continue;
    const [a, b] = parts;
    if (a > 12 && b <= 12) dmy++;
    else if (b > 12 && a <= 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

/**
 * Accepts virtually any common date: 2026-01-05, 2026/1/5, 05-01-2026, 1/15/2026,
 * 5.1.2026, 20260105, "Jan 5, 2026", "5 يناير 2026", ISO with time, Excel serials.
 * `order` resolves ambiguous numeric dates (both parts <= 12).
 */
function normalizeDate(input: string, order: DateOrder = "dmy"): string | null {
  const v = cleanDate(input);
  if (!v) return null;

  // Excel serial number (days since 1899-12-30)
  if (/^\d{5}$/.test(v)) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Number(v) * 86400000);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  // compact yyyymmdd
  if (/^\d{8}$/.test(v)) {
    const y = +v.slice(0, 4),
      m = +v.slice(4, 6),
      d = +v.slice(6, 8);
    return validYmd(y, m, d) ? iso(y, m, d) : null;
  }

  // month-name formats
  const named =
    v.match(/^(\d{1,2})[\s.,-]+([^\s.,-]+)[\s.,-]+(\d{2,4})$/) ??
    v.match(/^([^\s.,-]+)[\s.,-]+(\d{1,2})[\s.,-]+(\d{2,4})$/);
  if (named) {
    const a = named[1],
      b = named[2],
      yRaw = named[3];
    const monthWord = /^\d+$/.test(a) ? b : a;
    const dayWord = /^\d+$/.test(a) ? a : b;
    const m = MONTH_NAMES[monthWord.toLowerCase().replace(/\.$/, "")];
    if (m) {
      let y = Number(yRaw);
      if (yRaw.length <= 2) y += 2000;
      const d = Number(dayWord);
      if (validYmd(y, m, d)) return iso(y, m, d);
    }
  }

  const p = v.split(/[-/.\s]+/).filter(Boolean);
  if (p.length !== 3 || p.some((x) => !/^\d+$/.test(x))) return null;
  const [a, b, c] = p.map(Number);

  // year-first: 2026-01-05
  if (p[0].length === 4) return validYmd(a, b, c) ? iso(a, b, c) : null;

  let y = c;
  if (p[2].length <= 2) y += y < 100 ? 2000 : 0;

  // disambiguate day vs month
  const dayFirst = validYmd(y, b, a); // a=day, b=month
  const monthFirst = validYmd(y, a, b); // a=month, b=day
  if (dayFirst && monthFirst) return order === "mdy" ? iso(y, a, b) : iso(y, b, a);
  if (dayFirst) return iso(y, b, a);
  if (monthFirst) return iso(y, a, b);
  return null;
}

function num(v: string | undefined): number {
  if (!v) return 0;
  // strip currency symbols, spaces, thousand separators, arabic digits
  const ar = v.replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  const cleaned = ar
    .replace(/[^\d.,-]/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function pick(raw: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(raw).find((rk) => rk.toLowerCase().replace(/[\s_]/g, "") === k);
    if (found && raw[found] != null && String(raw[found]).trim() !== "")
      return String(raw[found]).trim();
  }
  return "";
}

export function parseTransactionsCsv(
  text: string,
  vaultByName: Record<string, string>,
  fallbackEntity?: { name: string; type: "customer" | "supplier" },
): ParsedRow[] {
  const clean = text.replace(/^\uFEFF/, "").trim();
  const parsed = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter: "", // auto-detect , ; \t |
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });

  const rows = parsed.data ?? [];
  const order = detectDateOrder(
    rows.map((r) => {
      const raw: Record<string, string> = {};
      for (const [k, v] of Object.entries(r ?? {})) raw[k] = v == null ? "" : String(v);
      return pick(raw, ["date", "التاريخ", "تاريخ"]);
    }),
  );

  return rows.map((rawRow, index) => {
    const raw: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawRow ?? {})) raw[k] = v == null ? "" : String(v);
    // normalized view used by the preview table
    const view = {
      no: pick(raw, ["no", "#", "num", "number", "seq", "order", "id", "رقم", "مسلسل", "م"]),
      date: pick(raw, ["date", "التاريخ", "تاريخ"]),
      type: pick(raw, ["type", "النوع", "نوع"]),
      entity:
        pick(raw, ["entity", "name", "party", "الاسم", "الطرف"]) || (fallbackEntity?.name ?? ""),
      entityType: pick(raw, ["entitytype", "نوعالطرف"]),
      quantity: pick(raw, ["quantity", "qty", "الكمية"]),
      unitPrice: pick(raw, ["unitprice", "price", "السعر"]),
      amountPaid: pick(raw, ["amountpaid", "paid", "amount", "المدفوع"]),
      vault: pick(raw, ["vault", "الخزنة"]),
      notes: pick(raw, ["notes", "note", "ملاحظات"]),
    };

    const parsedNo = num(view.no);
    const ref = view.no && Number.isFinite(parsedNo) && parsedNo !== 0 ? parsedNo : index + 1;

    const date = normalizeDate(view.date, order);

    const entityName = view.entity;
    const entityType = (
      view.entityType
        ? /supp|مورد/i.test(view.entityType)
          ? "supplier"
          : "customer"
        : (fallbackEntity?.type ?? "customer")
    ) as "customer" | "supplier";

    const type = resolveType(view.type, entityType);

    if (!date)
      return {
        ok: false,
        ref,
        reason: view.date ? `bad date "${view.date}"` : "missing date",
        raw: view,
      };
    if (!type)
      return {
        ok: false,
        ref,
        reason: view.type ? `unknown type "${view.type}"` : "missing type",
        raw: view,
      };
    if (!entityName) return { ok: false, ref, reason: "missing entity", raw: view };

    const quantity = num(view.quantity);
    const unitPrice = num(view.unitPrice);
    const amountPaid = num(view.amountPaid);
    const totalAmount = round2(quantity * unitPrice) || amountPaid;
    const vaultName = view.vault;

    return {
      ok: true,
      ref,
      raw: view,
      tx: {
        date,
        type,
        entityType,
        entityName,
        ref,
        vaultId: vaultName ? (vaultByName[vaultName.toLowerCase()] ?? "") : "",
        quantity,
        unitPrice,
        totalAmount,
        amountPaid,
        remainingBalance: round2(totalAmount - amountPaid),
        notes: view.notes,
      },
    };
  });
}
