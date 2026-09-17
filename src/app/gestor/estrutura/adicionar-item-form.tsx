"use client";

import { useActionState, useRef } from "react";
import { adicionarItemAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function AdicionarItemForm({ tipo }: { tipo: "setor" | "departamento" }) {
  const [estado, formAction, pendente] = useActionState(adicionarItemAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex gap-2">
        <input type="hidden" name="tipo" value={tipo} />
        <Input name="nome" placeholder="Nome" required minLength={1} className="flex-1" />
        <Button type="submit" variant="secondary" disabled={pendente} aria-label="Adicionar">
          +
        </Button>
      </div>
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
    </form>
  );
}
