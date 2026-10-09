"use client";

import { useActionState } from "react";
import { criarPesquisaAction } from "../actions";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CamposOrientacao } from "../campos-orientacao";

export function NovaPesquisaForm() {
  const [estado, formAction, pendente] = useActionState(criarPesquisaAction, undefined);
  // Devolvidos pela action num erro (o React 19 limpa o formulário a cada envio).
  const v = estado?.valores ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Nome da pesquisa" htmlFor="nome">
        <Input id="nome" name="nome" defaultValue={v.nome} required minLength={2} placeholder="Ex.: Pesquisa 2026 — Matriz" />
      </Field>
      <Field label="Quantidade de licenças (participantes)" htmlFor="licencas">
        <Input id="licencas" name="licencas" defaultValue={v.licencas} type="number" min={1} step={1} required />
      </Field>
      <Field label="Início" htmlFor="dataInicio">
        <Input id="dataInicio" name="dataInicio" defaultValue={v.dataInicio} type="datetime-local" required />
      </Field>
      <Field label="Encerramento" htmlFor="dataFim">
        <Input id="dataFim" name="dataFim" defaultValue={v.dataFim} type="datetime-local" required />
      </Field>
      <CamposOrientacao
        valores={{ videoYoutube: v.videoYoutube, textoOrientacao: v.textoOrientacao, exibirPrePesquisa: v.exibirPrePesquisa === "on" }}
      />
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      <Button type="submit" disabled={pendente} className="self-start mt-1">
        {pendente ? "Criando..." : "Criar pesquisa"}
      </Button>
    </form>
  );
}
