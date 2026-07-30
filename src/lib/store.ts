import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  /** Whether data has been loaded from Supabase at least once. */
  hydrated: boolean;
  loadFromSupabase: () => Promise<void>;
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

/** True when Supabase is configured and sync should fire. */
const syncOn = () => isSupabaseConfigured;

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      entities: DEMO_DATA.entities,
      vaults: DEMO_DATA.vaults,
      transactions: DEMO_DATA.transactions,
      lang: "ar",
      theme: defaultTheme,
      brand: { name: "", logo: "" },
      hydrated: false,

      loadFromSupabase: async () => {
        if (!isSupabaseConfigured) return;
        const result = await loadAllFromSupabase();
        if (!result) return;
        // Only overwrite local data if Supabase actually has data.
        // This prevents empty Supabase tables from wiping localStorage data.
        const hasData =
          result.data.entities.length > 0 ||
          result.data.vaults.length > 0 ||
          result.data.transactions.length > 0;
        if (hasData) {
          set({
            entities: result.data.entities,
            vaults: result.data.vaults,
            transactions: result.data.transactions,
          });
          if (result.settings) {
            set({
              lang: result.settings.lang as Lang,
              theme: result.settings.theme as ThemeMode,
              brand: result.settings.brand,
            });
          }
        }
        // Always mark as hydrated so we don't keep trying on every render
        set({ hydrated: true });
      },

      setBrand: (patch) => {
        set((s) => ({ brand: { ...s.brand, ...patch } }));
        if (syncOn()) {
          const s = get();
          syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
        }
      },
      setLang: (lang) => {
        set({ lang });
        if (syncOn()) {
          const s = get();
          syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
        }
      },
      setTheme: (theme) => {
        set({ theme });
        if (syncOn()) {
          const s = get();
          syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
        }
      },

      addEntity: (e) => {
        const entity: Entity = { ...e, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({ entities: [...s.entities, entity] }));
        if (syncOn()) syncEntityInsert(entity);
        return entity;
      },
      updateEntity: (id, patch) => {
        set((s) => ({
          entities: s.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
        if (syncOn()) syncEntityUpdate(id, patch);
      },
      deleteEntity: (id) => {
        set((s) => ({
          entities: s.entities.filter((e) => e.id !== id),
          transactions: s.transactions.filter((t) => t.entityId !== id),
        }));
        if (syncOn()) syncEntityDelete(id);
      },

      addVault: (name, balance = 0) => {
        const vault: Vault = { id: uid(), name, balance };
        set((s) => ({ vaults: [...s.vaults, vault] }));
        if (syncOn()) syncVaultInsert(vault);
        return vault;
      },
      updateVault: (id, patch) => {
        set((s) => ({ vaults: s.vaults.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
        if (syncOn()) syncVaultUpdate(id, patch);
      },
      deleteVault: (id) => {
        set((s) => ({ vaults: s.vaults.filter((v) => v.id !== id) }));
        if (syncOn()) syncVaultDelete(id);
      },

      addTransaction: (t) => {
        const tx: Transaction = { ...t, id: uid() };
        set((s) => ({ transactions: [...s.transactions, tx] }));
        if (syncOn()) syncTransactionInsert(tx);
        return tx;
      },
      updateTransaction: (id, patch) => {
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
        if (syncOn()) syncTransactionUpdate(id, patch);
      },
      deleteTransaction: (id) => {
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        if (syncOn()) syncTransactionDelete(id);
      },
      deleteTransactions: (ids) => {
        set((s) => ({ transactions: s.transactions.filter((t) => !ids.includes(t.id)) }));
        if (syncOn()) syncTransactionsDelete(ids);
      },

      replaceAll: (data) => {
        set({
          entities: data.entities ?? [],
          vaults: data.vaults ?? [],
          transactions: data.transactions ?? [],
        });
        if (syncOn()) syncReplaceAll(data);
      },

      loadDemoData: () => {
        set({
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
        set(empty);
        if (syncOn()) syncReplaceAll(empty);
      },
    }),
    {
      name: "biz-ledger-v1",
      version: 5,
      migrate: (state) => {
        const s = state as State;
        if (s && typeof s.theme !== "string") s.theme = defaultTheme;
        if (s && !s.brand) s.brand = { name: "", logo: "" };
        if (s && typeof s.hydrated !== "boolean") s.hydrated = false;
        return s;
      },
      partialize: (s) => ({
        entities: s.entities,
        vaults: s.vaults,
        transactions: s.transactions,
        lang: s.lang,
        theme: s.theme,
        brand: s.brand,
      }),
    },
  ),
);

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
