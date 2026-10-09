"use client";

import { useActionState, useMemo } from "react";
import Link from "next/link";
import { editarOrientacaoAction } from "../actions";
import { FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CamposOrientacao, type ValoresOrientacao } from "../../campos-orientacao";

export function EditarOrientacaoForm({ pesquisaId, valores }: { pesquisaId: string; valores: ValoresOrientacao }) {
  const acao = useMemo(() => editarOrientacaoAction.bind(null, pesquisaId), [pesquisaId]);
  const [estado, formAction, pendente] = useActionState(acao, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CamposOrientacao
        valores={
          estado?.valores
            ? { ...estado.valores, exibirPrePesquisa: estado.valores.exibirPrePesquisa === "on" }
            : valores
        }
      />
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        <Link href={`/gestor/pesquisas/${pesquisaId}`} className="text-sm text-zinc-600 hover:underline">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
