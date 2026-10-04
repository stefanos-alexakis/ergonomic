"use client";

import { useActionState, useMemo } from "react";
import { atualizarIdentificacaoAction, criarLevantamentoAction, type EstadoEixo3 } from "./actions";
import { Card, Fieldset } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Inicial = { nome: string; periodoInicio: string; periodoFim: string; responsavel: string; cargoResponsavel: string };

/** Identificação do levantamento — criar (sem id) ou editar (com id). */
export function IdentificacaoForm({ levantamentoId, inicial }: { levantamentoId?: string; inicial: Inicial }) {
  const acao = useMemo(
    () => (levantamentoId ? atualizarIdentificacaoAction.bind(null, levantamentoId) : criarLevantamentoAction),
    [levantamentoId],
  );
  const [estado, formAction, pendente] = useActionState<EstadoEixo3, FormData>(acao, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <Fieldset legend="Identificação do levantamento">
          <Field label="Nome" htmlFor="nome" hint="Ex.: Atestados 2025, Afastamentos 1º semestre">
            <Input id="nome" name="nome" required minLength={2} defaultValue={inicial.nome} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Período analisado — início" htmlFor="periodoInicio">
              <Input id="periodoInicio" name="periodoInicio" type="date" required defaultValue={inicial.periodoInicio} />
            </Field>
            <Field label="Período analisado — fim" htmlFor="periodoFim">
              <Input id="periodoFim" name="periodoFim" type="date" required defaultValue={inicial.periodoFim} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Responsável pelo preenchimento (RH/DP)" htmlFor="responsavel">
              <Input id="responsavel" name="responsavel" defaultValue={inicial.responsavel} />
            </Field>
            <Field label="Cargo do responsável" htmlFor="cargoResponsavel">
              <Input id="cargoResponsavel" name="cargoResponsavel" defaultValue={inicial.cargoResponsavel} />
            </Field>
          </div>
        </Fieldset>
      </Card>
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <Button type="submit" disabled={pendente} className="self-start">
        {pendente ? "Salvando..." : levantamentoId ? "Salvar identificação" : "Continuar para a planilha"}
      </Button>
    </form>
  );
}
