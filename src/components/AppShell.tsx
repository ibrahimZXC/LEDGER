import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Truck,
  Scale,
  ArrowLeftRight,
  Settings,
  Languages,
  Wallet,
  Boxes,
  BarChart3,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DARK_MODES } from "@/types";

const nav = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/analytics", key: "analytics", icon: BarChart3 },
  { to: "/vault", key: "cashVault", icon: Wallet },
  { to: "/customers", key: "customers", icon: Users },
  { to: "/suppliers", key: "suppliers", icon: Truck },
  { to: "/quantities", key: "quantities", icon: Boxes },
  { to: "/debts", key: "debts", icon: Scale },
  { to: "/transactions", key: "transactions", icon: ArrowLeftRight },
  { to: "/settings", key: "settings", icon: Settings },
] as const;

export function AppShell({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { lang, t, dir } = useI18n();
  const theme = useApp((s) => s.theme);
  const brand = useApp((s) => s.brand);

  const setLang = useApp((s) => s.setLang);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.dir = dir;
    root.lang = lang;
    root.dataset.theme = theme;
    root.classList.toggle("dark", DARK_MODES.includes(theme));
  }, [mounted, dir, lang, theme]);

  if (!mounted) return <div className="min-h-screen" />;

  return (
    <div
      className="flex min-h-screen text-foreground"
      style={{
        fontFamily:
          lang === "ar"
            ? "'IBM Plex Sans Arabic', 'Tajawal', system-ui, sans-serif"
            : "Inter, system-ui, sans-serif",
      }}
    >
      <aside className="hidden w-[13.5rem] shrink-0 flex-col bg-sidebar/60 backdrop-blur-[var(--panel-blur,0px)] border-border md:flex ltr:border-r rtl:border-l">
        <div className="flex h-14 items-center gap-2 px-5">
          {brand.logo ? (
            <img src={brand.logo} alt="" className="size-5 shrink-0 rounded object-cover" />
          ) : (
            <span className="grid size-5 place-items-center rounded bg-foreground text-[10px] font-bold text-background">
              ₤
            </span>
          )}
          <span className="truncate text-[13px] font-semibold tracking-tight">
            {brand.name || t("appName")}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-accent font-medium text-foreground",
                )}
              >
                <item.icon className="size-[15px]" strokeWidth={1.75} />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="m-2.5 flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Languages className="size-3.5" strokeWidth={1.75} />
          {lang === "ar" ? "English" : "العربية"}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/70 px-5 backdrop-blur-xl">
          <h1 className="text-[13px] font-medium tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            {action}
            <div className="flex items-center gap-1 md:hidden">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <item.icon className="size-4" strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-7">{children}</main>
      </div>
    </div>
  );
}
