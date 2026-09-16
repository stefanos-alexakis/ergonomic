"use client";

import { useActionState, useMemo, useState } from "react";
import type { User, Workspace } from "@prisma/client";
import { atualizarEmpresaAction } from "./actions";
import { Fieldset, Card } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckboxLabel } from "@/components/ui/checkbox";

export function EditarEmpresaForm({
  workspace,
  gestor,
}: {
  workspace: Workspace;
  gestor: User | null;
}) {
  const acao = useMemo(() => atualizarEmpresaAction.bind(null, workspace.id), [workspace.id]);
  const [estado, formAction, pendente] = useActionState(acao, undefined);
  const [corPropria, setCorPropria] = useState(Boolean(workspace.corPrimaria));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <Fieldset legend="Empresa">
          <Field label="Nome da empresa" htmlFor="nome">
            <Input id="nome" name="nome" required minLength={2} defaultValue={workspace.nome} />
          </Field>

          {workspace.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={workspace.logoUrl} alt="Logo atual" className="h-12 w-auto rounded border border-zinc-200 object-contain" />
          )}
          <Field label="Substituir logotipo" htmlFor="logo" hint="PNG, JPG ou WebP, até 2MB — deixe vazio para manter o atual">
            <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="h-auto py-1.5" />
          </Field>

          <CheckboxLabel checked={corPropria} onChange={(e) => setCorPropria(e.target.checked)}>
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
                defaultValue={workspace.corPrimaria ?? "#0F6E6E"}
                disabled={!corPropria}
                className="h-9 px-1.5 py-1 cursor-pointer disabled:cursor-not-allowed"
              />
            </Field>
            <Field label="Cor secundária" htmlFor="corSecundaria">
              <Input
                id="corSecundaria"
                name="corSecundaria"
                type="color"
                defaultValue={workspace.corSecundaria ?? "#EDF1EF"}
                disabled={!corPropria}
                className="h-9 px-1.5 py-1 cursor-pointer disabled:cursor-not-allowed"
              />
            </Field>
          </div>

          <CheckboxLabel name="isActive" defaultChecked={workspace.isActive}>
            Empresa ativa (desmarcar bloqueia o acesso do gestor e a jornada dos colaboradores)
          </CheckboxLabel>
        </Fieldset>
      </Card>

      {gestor && (
        <Card>
          <Fieldset legend="Gestor responsável">
            <Field label="Nome" htmlFor="gestorNome">
              <Input id="gestorNome" name="gestorNome" required minLength={2} defaultValue={gestor.nome} />
            </Field>
            <Field label="E-mail" htmlFor="gestorEmail">
              <Input id="gestorEmail" name="gestorEmail" type="email" required defaultValue={gestor.email} />
            </Field>
            <p className="text-xs text-zinc-500">
              A senha não é alterada aqui — o gestor pode trocá-la depois de logado.
            </p>
          </Fieldset>
        </Card>
      )}

      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <Button type="submit" disabled={pendente} className="self-start">
        {pendente ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
