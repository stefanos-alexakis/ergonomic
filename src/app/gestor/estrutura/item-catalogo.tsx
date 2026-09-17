"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { renomearItemAction, removerItemAction } from "./actions";
import type { TipoCatalogo } from "@/lib/estrutura";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function ItemCatalogo({
  tipo,
  id,
  nome,
  totalRespostas,
}: {
  tipo: TipoCatalogo;
  id: string;
  nome: string;
  totalRespostas: number;
}) {
  const [modo, setModo] = useState<"ver" | "editar" | "confirmarExcluir">("ver");
  const [pendenteExcluir, startTransition] = useTransition();
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  // useMemo essencial aqui, não só otimização — .bind() cria função nova
  // a cada render e confunde o rastreio de pending do useActionState
  // (mesmo bug documentado em review.md Parte 3b, achado na jornada do
  // colaborador; o padrão pra evitar é sempre memorizar o bind).
  const acaoRenomear = useMemo(() => renomearItemAction.bind(null, tipo, id), [tipo, id]);
  const [estado, formAction, pendenteRenomear] = useActionState(acaoRenomear, undefined);

  // useActionState só devolve {mensagem}/{erro} depois de um submit — sem
  // isso, salvar com sucesso deixava o formulário preso no modo "editar"
  // pra sempre (achado testando no navegador, não só em unit test).
  useEffect(() => {
    if (estado && !estado.erro) setModo("ver");
  }, [estado]);

  if (modo === "editar") {
    return (
      <form action={formAction} className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Input name="nome" defaultValue={nome} required minLength={1} className="flex-1" autoFocus />
          <Button type="submit" variant="secondary" disabled={pendenteRenomear}>
            {pendenteRenomear ? "..." : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setModo("ver")}>
            Cancelar
          </Button>
        </div>
        {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      </form>
    );
  }

  if (modo === "confirmarExcluir") {
    return (
      <div className="flex flex-col gap-1.5 rounded-md bg-red-50 px-2 py-1.5">
        <p className="text-xs text-red-700">
          Apagar &quot;{nome}&quot;?
          {totalRespostas > 0 &&
            ` ${totalRespostas} resposta${totalRespostas > 1 ? "s" : ""} ${
              totalRespostas > 1 ? "ficarão" : "ficará"
            } sem esse ${tipo === "setor" ? "setor" : "departamento"}.`}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="danger"
            disabled={pendenteExcluir}
            onClick={() =>
              startTransition(async () => {
                const resultado = await removerItemAction(tipo, id);
                if (resultado?.erro) setErroExcluir(resultado.erro);
              })
            }
          >
            {pendenteExcluir ? "..." : "Confirmar"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setModo("ver")}>
            Cancelar
          </Button>
        </div>
        {erroExcluir && <FieldError>{erroExcluir}</FieldError>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-zinc-700">
      <span>{nome}</span>
      <span className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={() => setModo("editar")} className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
          editar
        </button>
        <button
          type="button"
          onClick={() => setModo("confirmarExcluir")}
          className="text-red-600 hover:text-red-800 cursor-pointer"
        >
          excluir
        </button>
      </span>
    </div>
  );
}
