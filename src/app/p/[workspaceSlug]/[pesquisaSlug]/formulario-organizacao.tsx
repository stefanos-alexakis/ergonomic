"use client";

import { useActionState, useMemo } from "react";
import { salvarOrganizacaoAction, type EstadoFormulario } from "./actions";
import { Field, FieldError } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Item = { id: string; nome: string };

export function FormularioOrganizacao({
  workspaceSlug,
  pesquisaSlug,
  respostaId,
  setores,
  departamentos,
}: {
  workspaceSlug: string;
  pesquisaSlug: string;
  respostaId: string;
  setores: Item[];
  departamentos: Item[];
}) {
  // useMemo evita recriar a action a cada render — ver nota em
  // questionario.tsx sobre o bug que isso causa com useActionState.
  const acao = useMemo(
    () => salvarOrganizacaoAction.bind(null, workspaceSlug, pesquisaSlug, respostaId),
    [workspaceSlug, pesquisaSlug, respostaId],
  );
  const [estado, formAction, pendente] = useActionState<EstadoFormulario, FormData>(acao, undefined);

  return (
    <main className="max-w-lg mx-auto mt-14 px-5">
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">Onde você trabalha</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Essas informações são usadas só em análises por grupo — nunca para identificar você.
      </p>
      <form
        action={formAction}
        className="flex flex-col gap-5 rounded-lg border border-[var(--ws-line,#e4e4e7)] p-6 anim-fade-up"
      >
        <Field label="Setor" htmlFor="setorId">
          <Select id="setorId" name="setorId" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Departamento" htmlFor="departamentoId">
          <Select id="departamentoId" name="departamentoId" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </Select>
        </Field>

        {estado?.erro && <FieldError>{estado.erro}</FieldError>}
        <Button type="submit" disabled={pendente} className="w-full">
          {pendente ? "Salvando..." : "Continuar para o questionário"}
        </Button>
      </form>
    </main>
  );
}
