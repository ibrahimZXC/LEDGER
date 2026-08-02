import { create } from "zustand";
import type { AppData, Entity, ThemeMode, Transaction, Vault } from "@/types";
import type { Lang } from "@/lib/i18n";
import { entityDelta, vaultDelta } from "@/lib/ledger";
import { DEMO_DATA } from "@/lib/demo";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  loadAllFromSupabase,
  syncEntityDelete,
  syncEntityInsert,
  syncEntityUpdate,
  syncReplaceAll,
  syncSettings,
  syncTransactionDelete,
  syncTransactionInsert,
  syncTransactionUpdate,
  syncTransactionsDelete,
  syncVaultDelete,
  syncVaultInsert,
  syncVaultUpdate,
} from "@/lib/sync";

export const defaultTheme: ThemeMode = "light";

export interface Brand {
  name: string;
  logo: string;
}

interface State extends AppData {
  lang: Lang;
  theme: ThemeMode;
  brand: Brand;
  /** Sync error message (null when synced OK). */
  syncError: string | null;
  /** Whether data has been loaded from Supabase at least once. */
  hydrated: boolean;
  loadFromSupabase: () => Promise<void>;
  refreshFromSupabase: () => Promise<void>;
  setBrand: (patch: Partial<Brand>) => void;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeMode) => void;
  addEntity: (e: Omit<Entity, "id" | "createdAt">) => Entity;
  updateEntity: (id: string, patch: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  addVault: (name: string, balance?: number) => Vault;
  updateVault: (id: string, patch: Partial<Vault>) => void;
  deleteVault: (id: string) => void;
  addTransaction: (t: Omit<Transaction, "id">) => Transaction;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[]) => void;
  replaceAll: (data: AppData) => void;
  loadDemoData: () => void;
  clearAllData: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Merge two arrays by ID, preferring remote items for conflicts
 * but preserving local items that don't exist in remote (unsynced).
 * This prevents data loss when a refresh fires before async syncs complete.
 */
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const remoteIds = new Set(remote.map((item) => item.id));
  return [...remote, ...local.filter((item) => !remoteIds.has(item.id))];
}

/** True when Supabase is configured and sync should fire. */
const syncOn = () => isSupabaseConfigured;

// ── Manual localStorage persistence (bypasses zustand persist middleware issues with SSR) ──

const STORAGE_KEY = "biz-ledger-v1";

/** Load saved state from localStorage at module init. */
function loadSavedState(): Partial<AppData & { lang: Lang; theme: ThemeMode; brand: Brand }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Accept version 5 or unversioned data
    const state = parsed.version === 5 ? parsed.state : parsed;
    if (state) {
      if (typeof state.theme !== "string") state.theme = defaultTheme;
      if (!state.brand) state.brand = { name: "", logo: "" };
      return state;
    }
  } catch {
    // localStorage unavailable or corrupt — ignore
  }
  return {};
}

const saved = loadSavedState();

/** Persist current state to localStorage. */
function persistState(state: State): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          entities: state.entities,
          vaults: state.vaults,
          transactions: state.transactions,
          lang: state.lang,
          theme: state.theme,
          brand: state.brand,
        },
        version: 5,
      }),
    );
  } catch {
    // localStorage may be full or unavailable — ignore
  }
}

export const useApp = create<State>()((set, get) => {
  // Wrap set() to auto-persist to localStorage after every state change.
  const setAndPersist = (partial: Partial<State>) => {
    const next = { ...get(), ...partial } as State;
    persistState(next);
    set(partial);
  };

  return {
    // Start empty — data comes from Supabase (cloud) or localStorage (returning user).
    // Demo data is only loaded when explicitly requested via the "Load demo" button.
    entities: saved.entities ?? [],
    vaults: saved.vaults ?? [],
    transactions: saved.transactions ?? [],
    lang: saved.lang ?? "ar",
    theme: saved.theme ?? defaultTheme,
    brand: saved.brand ?? { name: "", logo: "" },
    syncError: null,
    hydrated: false,

    loadFromSupabase: async () => {
      if (!isSupabaseConfigured) return;
      const result = await loadAllFromSupabase();
      if (!result) return;
      if (result.error) {
        set({ syncError: result.error });
        return;
      }
      const remoteHasData =
        result.data.entities.length > 0 ||
        result.data.vaults.length > 0 ||
        result.data.transactions.length > 0;
      if (remoteHasData) {
        // Cloud has data → merge with local (preserves unsynced local items)
        const s = get();
        setAndPersist({
          entities: mergeById(s.entities, result.data.entities),
          vaults: mergeById(s.vaults, result.data.vaults),
          transactions: mergeById(s.transactions, result.data.transactions),
        });
        if (result.settings) {
          setAndPersist({
            lang: result.settings.lang as Lang,
            theme: result.settings.theme as ThemeMode,
            brand: result.settings.brand,
          });
        }
      } else {
        // Cloud appears empty — only seed if we have confirmed local data AND
        // this is a genuine first-time setup (not a silent RLS/permission failure).
        const s = get();
        const localHasData =
          s.entities.length > 0 || s.vaults.length > 0 || s.transactions.length > 0;
        if (localHasData) {
          // Double-check with a COUNT to confirm the table is truly empty
          const { supabase: _sb } = await import("@/lib/supabase");
          const { count, error: countError } = await _sb
            .from("entities")
            .select("*", { count: "exact", head: true });
          if (!countError && count === 0) {
            // Confirmed empty → safe to seed cloud with local data
            const err = await syncReplaceAll({
              entities: s.entities,
              vaults: s.vaults,
              transactions: s.transactions,
            });
            if (err) {
              set({ syncError: err });
            } else {
              await syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
            }
          } else if (countError) {
            // Count failed → likely a permissions issue; skip seed to protect cloud data
            console.warn(
              "[store] Could not verify remote state, skipping auto-seed:",
              countError.message,
            );
            set({ syncError: "Could not connect to Supabase: " + countError.message });
          }
          // If count > 0 but select returned [] → RLS is filtering rows (wrong config),
          // do NOT wipe — the data is there, just not visible yet.
        }
      }
      setAndPersist({ hydrated: true, syncError: null });
    },

    refreshFromSupabase: async () => {
      if (!isSupabaseConfigured) return;
      const result = await loadAllFromSupabase();
      if (!result) return;
      if (result.error) {
        set({ syncError: result.error });
        return;
      }
      // Merge remote with local — preserves unsynced local items (e.g. during bulk import)
      const remoteHasData =
        result.data.entities.length > 0 ||
        result.data.vaults.length > 0 ||
        result.data.transactions.length > 0;
      if (remoteHasData) {
        const s = get();
        setAndPersist({
          entities: mergeById(s.entities, result.data.entities),
          vaults: mergeById(s.vaults, result.data.vaults),
          transactions: mergeById(s.transactions, result.data.transactions),
        });
        if (result.settings) {
          setAndPersist({
            lang: result.settings.lang as Lang,
            theme: result.settings.theme as ThemeMode,
            brand: result.settings.brand,
          });
        }
      }
      set({ syncError: null });
    },

    setBrand: (patch) => {
      setAndPersist({ brand: { ...get().brand, ...patch } });
      if (syncOn()) {
        const s = get();
        syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
      }
    },
    setLang: (lang) => {
      setAndPersist({ lang });
      if (syncOn()) {
        const s = get();
        syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
      }
    },
    setTheme: (theme) => {
      setAndPersist({ theme });
      if (syncOn()) {
        const s = get();
        syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
      }
    },

    addEntity: (e) => {
      const entity: Entity = { ...e, id: uid(), createdAt: new Date().toISOString() };
      setAndPersist({ entities: [...get().entities, entity] });
      if (syncOn()) {
        syncEntityInsert(entity).then((err) => {
          if (err) set({ syncError: "Failed to save to cloud: " + err });
        });
      }
      return entity;
    },
    updateEntity: (id, patch) => {
      setAndPersist({
        entities: get().entities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      });
      if (syncOn()) {
        syncEntityUpdate(id, patch).then((err) => {
          if (err) set({ syncError: "Failed to update cloud: " + err });
        });
      }
    },
    deleteEntity: (id) => {
      setAndPersist({
        entities: get().entities.filter((e) => e.id !== id),
        transactions: get().transactions.filter((t) => t.entityId !== id),
      });
      if (syncOn()) {
        syncEntityDelete(id).then((err) => {
          if (err) set({ syncError: "Failed to delete from cloud: " + err });
        });
      }
    },

    addVault: (name, balance = 0) => {
      const vault: Vault = { id: uid(), name, balance };
      setAndPersist({ vaults: [...get().vaults, vault] });
      if (syncOn()) {
        syncVaultInsert(vault).then((err) => {
          if (err) set({ syncError: "Failed to save vault to cloud: " + err });
        });
      }
      return vault;
    },
    updateVault: (id, patch) => {
      setAndPersist({
        vaults: get().vaults.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      });
      if (syncOn()) {
        syncVaultUpdate(id, patch).then((err) => {
          if (err) set({ syncError: "Failed to update vault in cloud: " + err });
        });
      }
    },
    deleteVault: (id) => {
      setAndPersist({ vaults: get().vaults.filter((v) => v.id !== id) });
      if (syncOn()) {
        syncVaultDelete(id).then((err) => {
          if (err) set({ syncError: "Failed to delete vault from cloud: " + err });
        });
      }
    },

    addTransaction: (t) => {
      const tx: Transaction = { ...t, id: uid() };
      setAndPersist({ transactions: [...get().transactions, tx] });
      if (syncOn()) {
        syncTransactionInsert(tx).then((err) => {
          if (err) set({ syncError: "Failed to save transaction to cloud: " + err });
        });
      }
      return tx;
    },
    updateTransaction: (id, patch) => {
      setAndPersist({
        transactions: get().transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      });
      if (syncOn()) {
        syncTransactionUpdate(id, patch).then((err) => {
          if (err) set({ syncError: "Failed to update transaction in cloud: " + err });
        });
      }
    },
    deleteTransaction: (id) => {
      setAndPersist({ transactions: get().transactions.filter((t) => t.id !== id) });
      if (syncOn()) {
        syncTransactionDelete(id).then((err) => {
          if (err) set({ syncError: "Failed to delete transaction from cloud: " + err });
        });
      }
    },
    deleteTransactions: (ids) => {
      setAndPersist({ transactions: get().transactions.filter((t) => !ids.includes(t.id)) });
      if (syncOn()) {
        syncTransactionsDelete(ids).then((err) => {
          if (err) set({ syncError: "Failed to delete transactions from cloud: " + err });
        });
      }
    },

    replaceAll: (data) => {
      setAndPersist({
        entities: data.entities ?? [],
        vaults: data.vaults ?? [],
        transactions: data.transactions ?? [],
      });
      if (syncOn()) syncReplaceAll(data);
    },

    loadDemoData: () => {
      setAndPersist({
        entities: DEMO_DATA.entities,
        vaults: DEMO_DATA.vaults,
        transactions: DEMO_DATA.transactions,
      });
      if (syncOn()) syncReplaceAll(DEMO_DATA);
    },
    clearAllData: () => {
      const empty: AppData = {
        entities: [],
        vaults: [{ id: "main", name: "Main Cash", balance: 0 }],
        transactions: [],
      };
      setAndPersist(empty);
      if (syncOn()) syncReplaceAll(empty);
    },
  };
});

/** Derived selectors */
export function useTotals() {
  const { entities, vaults, transactions } = useApp();
  const vaultCash = vaults.reduce(
    (sum, v) =>
      sum +
      v.balance +
      transactions.filter((t) => t.vaultId === v.id).reduce((a, t) => a + vaultDelta(t), 0),
    0,
  );
  let receivables = 0;
  let payables = 0;
  for (const e of entities) {
    const bal = transactions
      .filter((t) => t.entityId === e.id)
      .reduce((sum, t) => sum + entityDelta(t), e.openingBalance);
    if (bal > 0) receivables += bal;
    else payables += -bal;
  }
  return { cash: vaultCash, receivables, payables };
}
