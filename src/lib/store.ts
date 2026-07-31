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
  // We use a shallow merge approach (no replace) so persistence is simpler.
  const setAndPersist = (partial: Partial<State>) => {
    const next = { ...get(), ...partial } as State;
    persistState(next);
    set(partial);
  };

  return {
    entities: saved.entities ?? DEMO_DATA.entities,
    vaults: saved.vaults ?? DEMO_DATA.vaults,
    transactions: saved.transactions ?? DEMO_DATA.transactions,
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
        // Cloud has data → pull it to local
        setAndPersist({
          entities: result.data.entities,
          vaults: result.data.vaults,
          transactions: result.data.transactions,
        });
        if (result.settings) {
          setAndPersist({
            lang: result.settings.lang as Lang,
            theme: result.settings.theme as ThemeMode,
            brand: result.settings.brand,
          });
        }
      } else {
        // Cloud is empty → push local data to seed the cloud
        const s = get();
        const localHasData =
          s.entities.length > 0 || s.vaults.length > 0 || s.transactions.length > 0;
        if (localHasData) {
          const err = await syncReplaceAll({
            entities: s.entities,
            vaults: s.vaults,
            transactions: s.transactions,
          });
          if (err) {
            set({ syncError: err });
          } else {
            // Also push settings
            await syncSettings({ lang: s.lang, theme: s.theme, brand: s.brand });
          }
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
      // Always overwrite local data with the latest remote state.
      setAndPersist({
        entities: result.data.entities,
        vaults: result.data.vaults,
        transactions: result.data.transactions,
      });
      if (result.settings) {
        setAndPersist({
          lang: result.settings.lang as Lang,
          theme: result.settings.theme as ThemeMode,
          brand: result.settings.brand,
        });
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
      if (syncOn()) syncEntityInsert(entity);
      return entity;
    },
    updateEntity: (id, patch) => {
      setAndPersist({
        entities: get().entities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      });
      if (syncOn()) syncEntityUpdate(id, patch);
    },
    deleteEntity: (id) => {
      setAndPersist({
        entities: get().entities.filter((e) => e.id !== id),
        transactions: get().transactions.filter((t) => t.entityId !== id),
      });
      if (syncOn()) syncEntityDelete(id);
    },

    addVault: (name, balance = 0) => {
      const vault: Vault = { id: uid(), name, balance };
      setAndPersist({ vaults: [...get().vaults, vault] });
      if (syncOn()) syncVaultInsert(vault);
      return vault;
    },
    updateVault: (id, patch) => {
      setAndPersist({
        vaults: get().vaults.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      });
      if (syncOn()) syncVaultUpdate(id, patch);
    },
    deleteVault: (id) => {
      setAndPersist({ vaults: get().vaults.filter((v) => v.id !== id) });
      if (syncOn()) syncVaultDelete(id);
    },

    addTransaction: (t) => {
      const tx: Transaction = { ...t, id: uid() };
      setAndPersist({ transactions: [...get().transactions, tx] });
      if (syncOn()) syncTransactionInsert(tx);
      return tx;
    },
    updateTransaction: (id, patch) => {
      setAndPersist({
        transactions: get().transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      });
      if (syncOn()) syncTransactionUpdate(id, patch);
    },
    deleteTransaction: (id) => {
      setAndPersist({ transactions: get().transactions.filter((t) => t.id !== id) });
      if (syncOn()) syncTransactionDelete(id);
    },
    deleteTransactions: (ids) => {
      setAndPersist({ transactions: get().transactions.filter((t) => !ids.includes(t.id)) });
      if (syncOn()) syncTransactionsDelete(ids);
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