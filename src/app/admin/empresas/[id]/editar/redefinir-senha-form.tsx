"use client";

import { useActionState, useMemo, useEffect, useState } from "react";
import { redefinirSenhaGestorAction } from "./actions";
import { Fieldset, Card } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RedefinirSenhaForm({ gestorId }: { gestorId: string }) {
  const acao = useMemo(() => redefinirSenhaGestorAction.bind(null, gestorId), [gestorId]);
  const [estado, formAction, pendente] = useActionState(acao, undefined);
  // useActionState não limpa o campo sozinho depois de um sucesso — sem
  // isso a senha antiga (redefinida) ficaria visível no input indefinidamente.
  const [chaveFormulario, setChaveFormulario] = useState(0);

  useEffect(() => {
    if (estado?.mensagem) setChaveFormulario((k) => k + 1);
  }, [estado]);

  return (
    <Card>
      <Fieldset legend="Redefinir senha do gestor">
        <form key={chaveFormulario} action={formAction} className="flex flex-col gap-3">
          <Field label="Nova senha" htmlFor="novaSenha" hint="8 ou mais caracteres">
            <Input id="novaSenha" name="novaSenha" type="password" required minLength={8} />
          </Field>
          {estado?.erro && <FieldError>{estado.erro}</FieldError>}
          {estado?.mensagem && <p className="text-sm text-emerald-700">{estado.mensagem}</p>}
          <Button type="submit" variant="secondary" disabled={pendente} className="self-start">
            {pendente ? "Salvando..." : "Definir nova senha"}
          </Button>
        </form>
      </Fieldset>
    </Card>
  );
}
