export type EntityType = "customer" | "supplier";

export type TransactionType =
  | "sale"
  | "purchase"
  | "payment_in"
  | "payment_out"
  | "supplier_return"
  | "sale_to_supplier"
  | "supplier_payment_in"
  | "customer_return"
  | "customer_discount";

export const TRANSACTION_TYPES: TransactionType[] = [
  "sale",
  "purchase",
  "payment_in",
  "payment_out",
  "supplier_return",
  "sale_to_supplier",
  "supplier_payment_in",
  "customer_return",
  "customer_discount",
];

export interface Entity {
  id: string;
  name: string;
  phone: string;
  type: EntityType;
  openingBalance: number;
  notes: string;
  createdAt: string;
}

export interface Vault {
  id: string;
  name: string;
  balance: number;
}

export interface Transaction {
  id: string;
  date: string;
  entityType: EntityType;
  entityId: string;
  vaultId: string;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  notes: string;
  /** optional source row number (from CSV import) used to keep same-day order */
  ref?: number;
}

export type ThemeMode = "light" | "dark" | "oled" | "glass" | "emerald" | "sand";

export const THEME_MODES: ThemeMode[] = ["light", "dark", "oled", "glass", "emerald", "sand"];

export const DARK_MODES: ThemeMode[] = ["dark", "oled", "emerald"];

export interface AppData {
  entities: Entity[];
  vaults: Vault[];
  transactions: Transaction[];
}
