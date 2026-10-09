"use client";

import { useActionState, useMemo } from "react";
import { criarConsultorAction, excluirConsultorAction, salvarConsultorAction, type EstadoConsultor } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { LIMITES_CONSULTOR, type DadosConsultor } from "@/lib/consultores-util";

const CAMPOS: { k: keyof DadosConsultor; rotulo: string; dica?: string }[] = [
  { k: "nome", rotulo: "Nome" },
  { k: "formacao", rotulo: "Formação", dica: "ex.: Psicóloga, Eng. de Segurança do Trabalho" },
  { k: "registro", rotulo: "Registro profissional", dica: "ex.: CRP 06/123456" },
  { k: "cargo", rotulo: "Cargo" },
  { k: "email", rotulo: "E-mail" },
];

/** Formulário de um consultor — novo (sem id) ou edição. */
export function ConsultorForm({ id, valores }: { id?: string; valores?: DadosConsultor }) {
  const acao = useMemo(() => (id ? salvarConsultorAction.bind(null, id) : criarConsultorAction), [id]);
  const [estado, formAction, pendente] = useActionState<EstadoConsultor, FormData>(acao, undefined);
  const excluir = useMemo(() => (id ? excluirConsultorAction.bind(null, id) : undefined), [id]);

  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      {/* key: depois de criar, o formulário em branco volta limpo. */}
      <form key={id ? undefined : estado?.sucesso} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <label key={c.k} className={`flex flex-col gap-1 text-xs font-medium text-zinc-600 ${c.k === "nome" ? "sm:col-span-2" : ""}`}>
            {c.rotulo}
            {c.dica && <span className="font-normal text-zinc-400">{c.dica}</span>}
            <Input
              name={c.k}
              type={c.k === "email" ? "email" : "text"}
              required={c.k === "nome"}
              maxLength={LIMITES_CONSULTOR[c.k]}
              defaultValue={valores?.[c.k] ?? ""}
              aria-label={`${c.rotulo}${valores ? ` de ${valores.nome}` : " (novo consultor)"}`}
            />
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando..." : id ? "Salvar" : "Cadastrar consultor"}
          </Button>
          {excluir && (
            <button
              type="submit"
              formAction={excluir}
              formNoValidate
              className="text-sm text-red-600 underline-offset-2 hover:underline cursor-pointer"
              onClick={(e) => {
                if (!window.confirm(`Excluir ${valores?.nome}? Relatórios já emitidos não mudam.`)) e.preventDefault();
              }}
            >
              Excluir
            </button>
          )}
          {estado?.erro && <FieldError>{estado.erro}</FieldError>}
          {estado?.sucesso && <p className="text-sm text-emerald-700">{estado.sucesso}</p>}
        </div>
      </form>
    </div>
  );
}
