"use client";

import { useActionState } from "react";
import { autenticar } from "./actions";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [erro, formAction, pendente] = useActionState(autenticar, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-6">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </Field>
      {erro && <FieldError>{erro}</FieldError>}
      <Button type="submit" disabled={pendente} className="w-full mt-1">
        {pendente ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
