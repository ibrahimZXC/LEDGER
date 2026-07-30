import { Palette } from "lucide-react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/format";
import { cn } from "@/lib/utils";
import { THEME_MODES } from "@/types";

const SWATCH: Record<string, string> = {
  light: "#ffffff",
  dark: "#22252b",
  oled: "#000000",
  glass: "#dbe6f6",
  emerald: "#12362c",
  sand: "#efe3cf",
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);

  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "panel px-3 py-2")}>
      {!compact && (
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Palette className="size-3.5" strokeWidth={1.75} />
          {t("themeMode")}
        </span>
      )}
      <div className="flex items-center gap-1">
        {THEME_MODES.map((mode) => (
          <button
            key={mode}
            title={t(`mode_${mode}`)}
            aria-label={t(`mode_${mode}`)}
            onClick={() => setTheme(mode)}
            className={cn(
              "size-5 rounded-full border border-border transition-transform hover:scale-110",
              theme === mode && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background",
            )}
            style={{ background: SWATCH[mode] }}
          />
        ))}
      </div>
    </div>
  );
}
