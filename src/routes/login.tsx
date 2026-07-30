import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Business Ledger" },
      { name: "description", content: "Sign in to your Business Ledger account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t, dir } = useI18n();
  const { signIn, signUp, configured } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "signin" ? await signIn(email, password) : await signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else if (mode === "signup") {
        setError(t("authError"));
      } else {
        navigate({ to: "/" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir={dir}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-lg bg-foreground text-lg font-bold text-background">
            ₤
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("appName")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("welcome")}</p>
        </div>

        {!configured && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {t("configError")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="email">
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:border-foreground/40"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="password">
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:border-foreground/40"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !configured}
            className={cn(
              "h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
              (busy || !configured) && "opacity-60",
            )}
          >
            {busy ? t("loading") : mode === "signin" ? t("signIn") : t("createAccount")}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          {mode === "signin" ? t("noAccount") : t("haveAccount")}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="font-medium text-foreground underline"
          >
            {mode === "signin" ? t("signUp") : t("signIn")}
          </button>
        </div>
      </div>
    </div>
  );
}
