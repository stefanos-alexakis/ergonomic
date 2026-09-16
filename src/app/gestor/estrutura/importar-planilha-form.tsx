"use client";

import { useActionState } from "react";
import { importarPlanilhaAction } from "./actions";
import { Button } from "@/components/ui/button";
import { FieldError, FieldSuccess } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

export function ImportarPlanilhaForm() {
  const [estado, formAction, pendente] = useActionState(importarPlanilhaAction, undefined);

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input
          name="planilha"
          type="file"
          accept=".xlsx"
          required
          className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 file:cursor-pointer hover:file:bg-zinc-50"
        />
        <Button type="submit" variant="secondary" disabled={pendente}>
          {pendente ? "Importando..." : "Importar planilha"}
        </Button>
        {estado?.erro && <FieldError>{estado.erro}</FieldError>}
        {estado?.mensagem && <FieldSuccess>{estado.mensagem}</FieldSuccess>}
      </form>
    </Card>
  );
}
