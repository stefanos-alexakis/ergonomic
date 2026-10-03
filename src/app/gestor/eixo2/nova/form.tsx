"use client";

import { useActionState } from "react";
import { criarAvaliacaoAction, type EstadoEixo2 } from "../actions";
import { SeletorSetores } from "../seletor-setores";
import { Card, Fieldset } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NovaAvaliacaoForm({
  setores,
  sugestaoNome,
}: {
  setores: { id: string; nome: string }[];
  sugestaoNome: string;
}) {
  const [estado, formAction, pendente] = useActionState<EstadoEixo2, FormData>(criarAvaliacaoAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <Fieldset legend="Identificação">
          <Field label="Nome da avaliação" htmlFor="nome" hint="Ex.: período ou unidade avaliada">
            <Input id="nome" name="nome" required minLength={2} defaultValue={sugestaoNome} />
          </Field>
          <Field label="Participantes" htmlFor="participantes" hint="Opcional — quem responde (liderança, RH, grupo focal)">
            <Input id="participantes" name="participantes" />
          </Field>
        </Fieldset>
      </Card>

      <Card>
        <Fieldset legend="Quais setores vão responder?">
          <p className="text-sm text-zinc-500 -mt-2">
            Confirme os setores avaliados nesta rodada. Você responde cada pergunta uma vez para todos e
            só ajusta os setores que forem diferentes.
          </p>
          <SeletorSetores setores={setores} />
        </Fieldset>
      </Card>

      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <Button type="submit" disabled={pendente} className="self-start">
        {pendente ? "Criando..." : "Criar e começar a responder"}
      </Button>
    </form>
  );
}
