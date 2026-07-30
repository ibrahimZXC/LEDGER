import { supabase } from "@/lib/supabase";
import type { AppData, Entity, Transaction, Vault } from "@/types";
import type { Brand } from "@/lib/store";

// ── Types matching the DB rows ──────────────────────────────────────────────

interface EntityRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  type: string;
  opening_balance: number;
  notes: string;
  created_at: string;
}

interface VaultRow {
  id: string;
  user_id: string;
  name: string;
  balance: number;
}

interface TransactionRow {
  id: string;
  user_id: string;
  date: string;
  entity_type: string;
  entity_id: string;
  vault_id: string;
  type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  amount_paid: number;
  remaining_balance: number;
  notes: string;
  ref: number | null;
}

interface SettingsRow {
  user_id: string;
  lang: string;
  theme: string;
  brand_name: string;
  brand_logo: string;
}

// ── Conversions ─────────────────────────────────────────────────────────────

function rowToEntity(r: EntityRow): Entity {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    type: r.type as Entity["type"],
    openingBalance: Number(r.opening_balance),
    notes: r.notes,
    createdAt: r.created_at,
  };
}

function entityToRow(e: Entity, userId: string): EntityRow {
  return {
    id: e.id,
    user_id: userId,
    name: e.name,
    phone: e.phone,
    type: e.type,
    opening_balance: e.openingBalance,
    notes: e.notes,
    created_at: e.createdAt,
  };
}

function rowToVault(r: VaultRow): Vault {
  return { id: r.id, name: r.name, balance: Number(r.balance) };
}

function vaultToRow(v: Vault, userId: string): VaultRow {
  return { id: v.id, user_id: userId, name: v.name, balance: v.balance };
}

function rowToTransaction(r: TransactionRow): Transaction {
  return {
    id: r.id,
    date: r.date,
    entityType: r.entity_type as Transaction["entityType"],
    entityId: r.entity_id,
    vaultId: r.vault_id,
    type: r.type as Transaction["type"],
    quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price),
    totalAmount: Number(r.total_amount),
    amountPaid: Number(r.amount_paid),
    remainingBalance: Number(r.remaining_balance),
    notes: r.notes,
    ref: r.ref ?? undefined,
  };
}

function transactionToRow(t: Transaction, userId: string): TransactionRow {
  return {
    id: t.id,
    user_id: userId,
    date: t.date,
    entity_type: t.entityType,
    entity_id: t.entityId,
    vault_id: t.vaultId,
    type: t.type,
    quantity: t.quantity,
    unit_price: t.unitPrice,
    total_amount: t.totalAmount,
    amount_paid: t.amountPaid,
    remaining_balance: t.remainingBalance,
    notes: t.notes,
    ref: t.ref ?? null,
  };
}

// ── Auth helper ─────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Load all data from Supabase ─────────────────────────────────────────────

export async function loadAllFromSupabase(): Promise<{
  data: AppData;
  settings: { lang: string; theme: string; brand: Brand } | null;
} | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const [entitiesRes, vaultsRes, transactionsRes, settingsRes] = await Promise.all([
    supabase.from("entities").select("*").eq("user_id", userId),
    supabase.from("vaults").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (entitiesRes.error) console.error("[sync] load entities:", entitiesRes.error.message);
  if (vaultsRes.error) console.error("[sync] load vaults:", vaultsRes.error.message);
  if (transactionsRes.error)
    console.error("[sync] load transactions:", transactionsRes.error.message);
  if (settingsRes.error) console.error("[sync] load settings:", settingsRes.error.message);

  const data: AppData = {
    entities: (entitiesRes.data as EntityRow[] | null)?.map(rowToEntity) ?? [],
    vaults: (vaultsRes.data as VaultRow[] | null)?.map(rowToVault) ?? [],
    transactions: (transactionsRes.data as TransactionRow[] | null)?.map(rowToTransaction) ?? [],
  };

  const settingsRow = settingsRes.data as SettingsRow | null;
  const settings = settingsRow
    ? {
        lang: settingsRow.lang,
        theme: settingsRow.theme,
        brand: { name: settingsRow.brand_name, logo: settingsRow.brand_logo },
      }
    : null;

  return { data, settings };
}

// ── Entity sync ─────────────────────────────────────────────────────────────

export async function syncEntityInsert(e: Entity): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("entities").insert(entityToRow(e, userId));
  if (error) console.error("[sync] insert entity:", error.message);
}

export async function syncEntityUpdate(id: string, patch: Partial<Entity>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const row: Partial<EntityRow> = { user_id: userId };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.openingBalance !== undefined) row.opening_balance = patch.openingBalance;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.createdAt !== undefined) row.created_at = patch.createdAt;
  const { error } = await supabase.from("entities").update(row).eq("id", id).eq("user_id", userId);
  if (error) console.error("[sync] update entity:", error.message);
}

export async function syncEntityDelete(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("entities").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("[sync] delete entity:", error.message);
}

// ── Vault sync ──────────────────────────────────────────────────────────────

export async function syncVaultInsert(v: Vault): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("vaults").insert(vaultToRow(v, userId));
  if (error) console.error("[sync] insert vault:", error.message);
}

export async function syncVaultUpdate(id: string, patch: Partial<Vault>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const row: Partial<VaultRow> = { user_id: userId };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.balance !== undefined) row.balance = patch.balance;
  const { error } = await supabase.from("vaults").update(row).eq("id", id).eq("user_id", userId);
  if (error) console.error("[sync] update vault:", error.message);
}

export async function syncVaultDelete(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("vaults").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("[sync] delete vault:", error.message);
}

// ── Transaction sync ────────────────────────────────────────────────────────

export async function syncTransactionInsert(t: Transaction): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("transactions").insert(transactionToRow(t, userId));
  if (error) console.error("[sync] insert transaction:", error.message);
}

export async function syncTransactionUpdate(
  id: string,
  patch: Partial<Transaction>,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const row: Partial<TransactionRow> = { user_id: userId };
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.entityType !== undefined) row.entity_type = patch.entityType;
  if (patch.entityId !== undefined) row.entity_id = patch.entityId;
  if (patch.vaultId !== undefined) row.vault_id = patch.vaultId;
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.quantity !== undefined) row.quantity = patch.quantity;
  if (patch.unitPrice !== undefined) row.unit_price = patch.unitPrice;
  if (patch.totalAmount !== undefined) row.total_amount = patch.totalAmount;
  if (patch.amountPaid !== undefined) row.amount_paid = patch.amountPaid;
  if (patch.remainingBalance !== undefined) row.remaining_balance = patch.remainingBalance;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.ref !== undefined) row.ref = patch.ref ?? null;
  const { error } = await supabase
    .from("transactions")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) console.error("[sync] update transaction:", error.message);
}

export async function syncTransactionDelete(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
  if (error) console.error("[sync] delete transaction:", error.message);
}

export async function syncTransactionsDelete(ids: string[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", ids)
    .eq("user_id", userId);
  if (error) console.error("[sync] delete transactions:", error.message);
}

// ── Settings sync ───────────────────────────────────────────────────────────

export async function syncSettings(settings: {
  lang: string;
  theme: string;
  brand: Brand;
}): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const row: SettingsRow = {
    user_id: userId,
    lang: settings.lang,
    theme: settings.theme,
    brand_name: settings.brand.name,
    brand_logo: settings.brand.logo,
  };
  const { error } = await supabase.from("settings").upsert(row, { onConflict: "user_id" });
  if (error) console.error("[sync] upsert settings:", error.message);
}

// ── Bulk replace (for import / clear / demo) ────────────────────────────────

export async function syncReplaceAll(data: AppData): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  // Delete all existing, then insert new — simplest correct approach
  await Promise.all([
    supabase.from("transactions").delete().eq("user_id", userId),
    supabase.from("entities").delete().eq("user_id", userId),
    supabase.from("vaults").delete().eq("user_id", userId),
  ]);

  if (data.entities.length > 0) {
    const { error } = await supabase
      .from("entities")
      .insert(data.entities.map((e) => entityToRow(e, userId)));
    if (error) console.error("[sync] bulk insert entities:", error.message);
  }
  if (data.vaults.length > 0) {
    const { error } = await supabase
      .from("vaults")
      .insert(data.vaults.map((v) => vaultToRow(v, userId)));
    if (error) console.error("[sync] bulk insert vaults:", error.message);
  }
  if (data.transactions.length > 0) {
    const { error } = await supabase
      .from("transactions")
      .insert(data.transactions.map((t) => transactionToRow(t, userId)));
    if (error) console.error("[sync] bulk insert transactions:", error.message);
  }
}
