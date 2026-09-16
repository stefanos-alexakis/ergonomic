"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { iniciarAction, type EstadoFormulario } from "./actions";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FormularioCodigo({
  workspaceSlug,
  pesquisaSlug,
  valorInicial,
}: {
  workspaceSlug: string;
  pesquisaSlug: string;
  valorInicial?: string;
}) {
  // useMemo evita recriar a action a cada render — ver nota em
  // questionario.tsx sobre o bug que isso causa com useActionState.
  const acao = useMemo(() => iniciarAction.bind(null, workspaceSlug, pesquisaSlug), [workspaceSlug, pesquisaSlug]);
  const [estado, formAction, pendente] = useActionState<EstadoFormulario, FormData>(acao, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const jaTentouAutoEnviar = useRef(false);

  // Código chegou pelo QR code — envia sozinho uma vez, sem exigir
  // clique extra de quem só quer escanear e responder.
  useEffect(() => {
    if (valorInicial && !jaTentouAutoEnviar.current) {
      jaTentouAutoEnviar.current = true;
      formRef.current?.requestSubmit();
    }
  }, [valorInicial]);

  return (
    <main className="max-w-sm mx-auto mt-16 px-5">
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">Acessar a pesquisa</h1>
      <p className="text-sm text-zinc-500 mb-6">Informe o código do seu cartão de acesso.</p>
      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4 rounded-lg border border-[var(--ws-line,#e4e4e7)] p-6 anim-fade-up"
      >
        <Field label="Código de acesso" htmlFor="codigo">
          <Input
            id="codigo"
            name="codigo"
            required
            minLength={4}
            defaultValue={valorInicial}
            autoCapitalize="characters"
            autoFocus
            className="uppercase text-lg tracking-widest text-center h-12"
          />
        </Field>
        {estado?.erro && <FieldError>{estado.erro}</FieldError>}
        <Button type="submit" disabled={pendente} className="w-full">
          {pendente ? "Entrando..." : "Continuar"}
        </Button>
      </form>
    </main>
  );
}
