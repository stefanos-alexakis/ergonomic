"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { definirSetoresAction, type EstadoEixo2 } from "../../actions";
import { SeletorSetores } from "../../seletor-setores";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function SetoresForm({
  avaliacaoId,
  todos,
  selecionados,
}: {
  avaliacaoId: string;
  todos: { id: string; nome: string }[];
  selecionados: string[];
}) {
  // useMemo: .bind() novo a cada render faz o useActionState engolir o
  // primeiro envio (review.md Parte 3b).
  const acao = useMemo(() => definirSetoresAction.bind(null, avaliacaoId), [avaliacaoId]);
  const [estado, formAction, pendente] = useActionState<EstadoEixo2, FormData>(acao, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <p className="text-sm text-zinc-500 mb-4">
          Setor desmarcado sai da avaliação e perde as respostas dele. Setor incluído já recebe as
          respostas que estão iguais para todos os outros.
        </p>
        <SeletorSetores setores={todos} selecionados={selecionados} />
      </Card>
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar setores"}
        </Button>
        <Link href={`/gestor/eixo2/${avaliacaoId}`}>
          <Button type="button" variant="ghost">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
