"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

function parse(formData: FormData) {
  return credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error: /confirm/i.test(error.message)
        ? "Confirme seu e-mail antes de entrar. Veja a caixa de entrada."
        : "E-mail ou senha incorretos.",
    };
  }
  redirect("/");
}

const usernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_.]{3,30}$/, "Nome de usuário: 3 a 30 letras, números, _ ou .");

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const username = usernameSchema.safeParse(formData.get("username"));
  if (!username.success) return { error: username.error.issues[0].message };

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${protocol}://${host}/auth/callback`,
      data: { username: username.data },
    },
  });
  if (error) {
    return {
      error: /registered|exists/i.test(error.message)
        ? "Já existe uma conta com esse e-mail."
        : "Não foi possível criar a conta. Tente novamente.",
    };
  }

  // With email confirmation on, there is no session until the user clicks the link.
  if (!data.session) {
    return { message: "Conta criada! Enviamos um link de confirmação para o seu e-mail." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
