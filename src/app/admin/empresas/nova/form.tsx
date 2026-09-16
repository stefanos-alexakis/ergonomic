"use client";

import { useActionState, useState } from "react";
import { criarEmpresaAction } from "../actions";
import { Fieldset, Card } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckboxLabel } from "@/components/ui/checkbox";

export function NovaEmpresaForm() {
  const [estado, formAction, pendente] = useActionState(criarEmpresaAction, undefined);
  const [corPropria, setCorPropria] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <Fieldset legend="Empresa">
          <Field label="Nome da empresa" htmlFor="nome">
            <Input id="nome" name="nome" required minLength={2} />
          </Field>
          <Field label="Logotipo" htmlFor="logo" hint="PNG, JPG ou WebP, até 2MB">
            <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="h-auto py-1.5" />
          </Field>

          <CheckboxLabel
            checked={corPropria}
            onChange={(e) => setCorPropria(e.target.checked)}
          >
            Esta empresa tem cores institucionais próprias
          </CheckboxLabel>
          {!corPropria && (
            <p className="text-xs text-zinc-500 -mt-2">
              Sem marcar, a pesquisa dessa empresa usa o tema cinza padrão.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor primária" htmlFor="corPrimaria">
              <Input
                id="corPrimaria"
                name="corPrimaria"
                type="color"
                defaultValue="#0F6E6E"
                disabled={!corPropria}
                className="h-9 px-1.5 py-1 cursor-pointer disabled:cursor-not-allowed"
              />
            </Field>
            <Field label="Cor secundária" htmlFor="corSecundaria">
              <Input
                id="corSecundaria"
                name="corSecundaria"
                type="color"
                defaultValue="#EDF1EF"
                disabled={!corPropria}
                className="h-9 px-1.5 py-1 cursor-pointer disabled:cursor-not-allowed"
              />
            </Field>
          </div>
        </Fieldset>
      </Card>

      <Card>
        <Fieldset legend="Gestor responsável">
          <Field label="Nome" htmlFor="gestorNome">
            <Input id="gestorNome" name="gestorNome" required minLength={2} />
          </Field>
          <Field label="E-mail" htmlFor="gestorEmail">
            <Input id="gestorEmail" name="gestorEmail" type="email" required />
          </Field>
          <Field label="Senha provisória" htmlFor="gestorSenha" hint="8 ou mais caracteres">
            <Input id="gestorSenha" name="gestorSenha" type="password" required minLength={8} />
          </Field>
        </Fieldset>
      </Card>

      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <Button type="submit" disabled={pendente} className="self-start">
        {pendente ? "Criando..." : "Criar empresa"}
      </Button>
    </form>
  );
}
