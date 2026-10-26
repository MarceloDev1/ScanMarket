"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { login, signup, type AuthState } from "./actions";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : signup,
    linkError ? { error: "O link de confirmação expirou ou é inválido. Entre ou crie a conta de novo." } : {},
  );

  const isLogin = mode === "login";

  return (
    <form action={formAction} className="space-y-4">
      {!isLogin && (
        <div className="space-y-1.5">
          <label htmlFor="username" className="text-sm font-medium">
            Nome de usuário
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            pattern="[A-Za-z0-9_.]{3,30}"
            title="3 a 30 letras, números, _ ou ."
            required
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          required
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
        />
        {!isLogin && <p className="text-xs text-muted">Mínimo de 8 caracteres.</p>}
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-xl bg-accent p-3 text-sm">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {isLogin ? "Entrar" : "Criar conta"}
      </button>

      <button
        type="button"
        onClick={() => setMode(isLogin ? "signup" : "login")}
        className="w-full text-center text-sm text-muted"
      >
        {isLogin ? "Ainda não tem conta? " : "Já tem conta? "}
        <span className="font-medium text-primary">{isLogin ? "Criar conta" : "Entrar"}</span>
      </button>
    </form>
  );
}
