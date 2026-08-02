import { Palette, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/format";
import { cn } from "@/lib/utils";
import { THEME_MODES } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-md text-[11px] uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
            compact ? "px-1.5 py-1" : "px-3 py-2 panel",
          )}
        >
          <Palette className="size-3.5" strokeWidth={1.75} />
          {!compact && <span>{t("themeMode")}</span>}
          <span
            className="size-4 rounded-full border border-border"
            style={{ background: SWATCH[theme] }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEME_MODES.map((mode) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => setTheme(mode)}
            className="flex items-center gap-2.5"
          >
            <span
              className="size-4 rounded-full border border-border"
              style={{ background: SWATCH[mode] }}
            />
            <span className="flex-1 text-xs">{t(`mode_${mode}`)}</span>
            {theme === mode && <Check className="size-3.5" strokeWidth={2} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}