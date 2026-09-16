"use client";

import { useActionState } from "react";
import { gerarLicencasAction } from "./actions";
import { Button } from "@/components/ui/button";
import { FieldError, FieldSuccess } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

export function GerarLicencasButton({ pesquisaId }: { pesquisaId: string }) {
  const [estado, formAction, pendente] = useActionState(gerarLicencasAction, undefined);

  return (
    <Card className="max-w-md">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="pesquisaId" value={pesquisaId} />
        <p className="text-sm text-zinc-500">Nenhum código gerado ainda para esta pesquisa.</p>
        <Button type="submit" disabled={pendente} className="self-start">
          {pendente ? "Gerando..." : "Gerar licenças e códigos de acesso"}
        </Button>
        {estado?.erro && <FieldError>{estado.erro}</FieldError>}
        {estado?.mensagem && !estado?.erro && <FieldSuccess>{estado.mensagem}</FieldSuccess>}
      </form>
    </Card>
  );
}
