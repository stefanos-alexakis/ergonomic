"use client";

import { useActionState, useMemo } from "react";
import { salvarTextoAction, type EstadoTexto } from "./actions";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function TextoForm({ chave, titulo, conteudo }: { chave: "LEGISLACAO"; titulo: string; conteudo: string }) {
  const acao = useMemo(() => salvarTextoAction.bind(null, chave), [chave]);
  const [estado, formAction, pendente] = useActionState<EstadoTexto, FormData>(acao, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Textarea name="conteudo" rows={18} defaultValue={conteudo} aria-label={titulo} />
      <p className="text-xs text-zinc-500">
        Texto simples. Linha em branco separa parágrafos; linha começando com <code># </code> vira subtítulo e com{" "}
        <code>- </code> vira item de lista.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </Button>
        {estado?.erro && <FieldError>{estado.erro}</FieldError>}
        {estado?.sucesso && <p className="text-sm text-emerald-700">{estado.sucesso}</p>}
      </div>
    </form>
  );
}
