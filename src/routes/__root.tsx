import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { useApp } from "@/lib/store";
import { subscribeToChanges } from "@/lib/sync";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Business Ledger — Cash, Debts & Customers" },
      {
        name: "description",
        content:
          "Minimal business management: customers, suppliers, cash vaults and debt tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap",
      },

      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const loadFromSupabase = useApp((s) => s.loadFromSupabase);
  const refreshFromSupabase = useApp((s) => s.refreshFromSupabase);
  const hydrated = useApp((s) => s.hydrated);
  const busyRef = useRef(false);

  // Load data from Supabase on mount.
  // Always fetch fresh from Supabase regardless of hydrated flag,
  // so opening a private tab or a new device always gets latest cloud data.
  useEffect(() => {
    loadFromSupabase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to realtime changes from other devices
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Small delay so we don't fight with the initial load
    const timer = setTimeout(() => {
      if (hydrated) {
        unsubscribe = subscribeToChanges(() => {
          if (busyRef.current) return;
          busyRef.current = true;
          refreshFromSupabase().finally(() => {
            busyRef.current = false;
          });
        });
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [hydrated, refreshFromSupabase]);

  // Re-sync when the tab becomes visible again (e.g. switching back to the app)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && hydrated) {
        if (busyRef.current) return;
        busyRef.current = true;
        refreshFromSupabase().finally(() => {
          busyRef.current = false;
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [hydrated, refreshFromSupabase]);

  // Re-sync when the window regains focus
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && hydrated) {
        if (busyRef.current) return;
        busyRef.current = true;
        refreshFromSupabase().finally(() => {
          busyRef.current = false;
        });
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hydrated, refreshFromSupabase]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}