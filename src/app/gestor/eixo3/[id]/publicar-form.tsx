"use client";

import { useActionState, useMemo } from "react";
import { publicarLevantamentoAction, type EstadoEixo3 } from "../actions";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TEXTO_DECLARACAO } from "@/lib/eixo3";

export function PublicarForm({
  levantamentoId,
  podePublicar,
  responsavel,
  cargoResponsavel,
}: {
  levantamentoId: string;
  podePublicar: boolean;
  responsavel: string;
  cargoResponsavel: string;
}) {
  const acao = useMemo(() => publicarLevantamentoAction.bind(null, levantamentoId), [levantamentoId]);
  const [estado, formAction, pendente] = useActionState<EstadoEixo3, FormData>(acao, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Responsável pelo preenchimento (RH/DP)" htmlFor="pub-responsavel">
          <Input id="pub-responsavel" name="responsavel" required minLength={2} defaultValue={responsavel} />
        </Field>
        <Field label="Cargo" htmlFor="pub-cargo">
          <Input id="pub-cargo" name="cargoResponsavel" defaultValue={cargoResponsavel} />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer">
        <input type="checkbox" name="declaracao" required className="mt-1 h-4 w-4 rounded border-zinc-300" />
        <span>{TEXTO_DECLARACAO}</span>
      </label>
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <Button
        type="submit"
        disabled={pendente || !podePublicar}
        className="self-start"
        title={!podePublicar ? "Envie a planilha e associe todos os setores primeiro" : undefined}
      >
        {pendente ? "Publicando..." : "Publicar levantamento"}
      </Button>
    </form>
  );
}
