"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary mt-5 w-full py-2.5" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="mt-7">
      <input type="hidden" name="next" value={next ?? "/home"} />

      <label className="mb-1.5 block text-xs font-medium text-dim" htmlFor="email">
        E-mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
        className="field"
        placeholder="voce@triangulosolutions.com.br"
      />

      <label className="mb-1.5 mt-4 block text-xs font-medium text-dim" htmlFor="password">
        Senha
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="field"
        placeholder="••••••••"
      />

      {state.error && (
        <p className="mt-3 rounded-md border border-brand/40 bg-brand-soft px-3 py-2 text-xs text-brand">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
