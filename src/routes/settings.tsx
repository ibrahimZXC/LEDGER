import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Upload, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/format";
import { cn } from "@/lib/utils";
import { THEME_MODES, type AppData, type ThemeMode } from "@/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Business Ledger" },
      {
        name: "description",
        content: "Appearance modes, language and full data backup for your ledger.",
      },
      { property: "og:title", content: "Settings — Business Ledger" },
      {
        property: "og:description",
        content: "Appearance modes, language and full data backup for your ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const SWATCH: Record<ThemeMode, string[]> = {
  light: ["#ffffff", "#f4f5f7", "#111827"],
  dark: ["#1c1d21", "#2a2c31", "#e8eaed"],
  oled: ["#000000", "#0e0e0e", "#f2c14e"],
  glass: ["#e8ecf7", "#ffffff", "#6b8afd"],
  emerald: ["#12241d", "#1c3830", "#4fd7a5"],
  sand: ["#fbf7f0", "#f0e7d8", "#8a5a35"],
};

function SettingsPage() {
  const { t, lang } = useI18n();
  const state = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [imported, setImported] = useState(false);

  function exportData() {
    const data: AppData = {
      entities: state.entities,
      vaults: state.vaults,
      transactions: state.transactions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    const text = await file.text();
    try {
      state.replaceAll(JSON.parse(text) as AppData);
      setImported(true);
      setTimeout(() => setImported(false), 2000);
    } catch {
      /* invalid file */
    }
  }

  function pickLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => state.setBrand({ logo: String(reader.result || "") });
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title={t("settings")}>
      <div className="mx-auto max-w-3xl space-y-5">
        <Section title={t("branding")}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-accent/50">
              {state.brand.logo ? (
                <img
                  src={state.brand.logo}
                  alt={t("brandLogo")}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold">₤</span>
              )}
            </div>
            <input
              value={state.brand.name}
              onChange={(e) => state.setBrand({ name: e.target.value })}
              placeholder={t("brandName")}
              className="h-8 min-w-48 flex-1 rounded-md border border-border bg-transparent px-2.5 text-xs outline-none focus-visible:border-foreground/40"
            />
            <Button size="sm" variant="outline" onClick={() => logoRef.current?.click()}>
              <Upload className="size-3.5" strokeWidth={1.75} />
              {t("uploadLogo")}
            </Button>
            {state.brand.logo && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => state.setBrand({ logo: "" })}
              >
                {t("removeLogo")}
              </Button>
            )}
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickLogo(f);
                e.target.value = "";
              }}
            />
          </div>
        </Section>

        <Section title={t("themeMode")}>
          <div className="grid gap-2 sm:grid-cols-3">
            {THEME_MODES.map((mode) => {
              const active = state.theme === mode;
              return (
                <button
                  key={mode}
                  onClick={() => state.setTheme(mode)}
                  className={cn(
                    "group flex items-center gap-3 rounded-md border p-2.5 text-start transition-colors",
                    active ? "border-foreground/40 bg-accent" : "border-border hover:bg-accent/60",
                  )}
                >
                  <span className="flex overflow-hidden rounded border border-border">
                    {SWATCH[mode].map((c) => (
                      <span key={c} className="size-5" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="flex-1 text-xs font-medium">{t(`mode_${mode}`)}</span>
                  {active && <Check className="size-3.5" strokeWidth={2} />}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title={t("language")}>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={lang === "ar" ? "default" : "outline"}
              onClick={() => state.setLang("ar")}
            >
              العربية
            </Button>
            <Button
              size="sm"
              variant={lang === "en" ? "default" : "outline"}
              onClick={() => state.setLang("en")}
            >
              English
            </Button>
          </div>
        </Section>

        <Section title={t("demoData")}>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => state.loadDemoData()}>
              {t("loadDemo")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => state.clearAllData()}
            >
              {t("clearData")}
            </Button>
          </div>
        </Section>

        <Section title={t("backup")}>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportData}>
              <Download className="size-3.5" strokeWidth={1.75} />
              Export JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5" strokeWidth={1.75} />
              Import JSON
            </Button>
            {imported && <span className="text-xs text-positive">✓</span>}
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importData(f);
                e.target.value = "";
              }}
            />
          </div>
        </Section>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
