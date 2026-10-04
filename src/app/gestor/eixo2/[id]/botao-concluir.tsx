"use client";

import { useState, useTransition } from "react";
import { concluirAvaliacaoAction } from "../actions";
import { Button } from "@/components/ui/button";

/** Conclui a avaliação de qualquer etapa — só aparece com tudo respondido. */
export function BotaoConcluir({ avaliacaoId }: { avaliacaoId: string }) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        type="button"
        disabled={pendente}
        onClick={() =>
          startTransition(async () => {
            setErro(null);
            const r = await concluirAvaliacaoAction(avaliacaoId);
            if (r?.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? "Concluindo..." : "Concluir avaliação"}
      </Button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </span>
  );
}
