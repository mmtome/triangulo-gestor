"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/home");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return { error: "E-mail ou senha inválidos." };
  }

  await createSession(user.id);
  redirect(next.startsWith("/") ? next : "/home");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
