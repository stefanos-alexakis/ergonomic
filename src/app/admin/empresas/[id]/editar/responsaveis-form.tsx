"use client";

import { useActionState, useMemo, useState } from "react";
import { salvarResponsaveisAction, type EstadoResponsaveis } from "./actions";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { LIMITES_RESPONSAVEL, type LinhaResponsavel } from "@/lib/responsaveis-relatorio-util";

type Linha = Omit<LinhaResponsavel, "especialidade" | "descritivo" | "empresa" | "email" | "celular" | "ordem"> & {
  chave: string;
  especialidade: string;
  descritivo: string;
  empresa: string;
  email: string;
  celular: string;
  ordem: string;
};

let contador = 0;
const novaChave = () => `n${++contador}`;

function daLinha(l: LinhaResponsavel, chave: string): Linha {
  return {
    chave,
    areaFuncao: l.areaFuncao,
    nome: l.nome,
    especialidade: l.especialidade ?? "",
    descritivo: l.descritivo ?? "",
    empresa: l.empresa ?? "",
    email: l.email ?? "",
    celular: l.celular ?? "",
    incluirNoRelatorio: l.incluirNoRelatorio,
    ordem: l.ordem === null ? "" : String(l.ordem),
  };
}

/**
 * Responsáveis do relatório: pessoas que só constam e assinam (sem login).
 * Uma tela só, salva a lista inteira. "Consta" marca quem entra no próximo
 * relatório; "Ordem" define a ordem das assinaturas.
 */
export function ResponsaveisForm({
  iniciais,
  empresaPadrao,
  workspaceId,
}: {
  iniciais: (LinhaResponsavel & { id: string })[];
  empresaPadrao: string;
  workspaceId: string;
}) {
  const acao = useMemo(() => salvarResponsaveisAction.bind(null, workspaceId), [workspaceId]);
  const [estado, formAction, pendente] = useActionState<EstadoResponsaveis, FormData>(acao, undefined);
  const [linhas, setLinhas] = useState<Linha[]>(() => iniciais.map((l) => daLinha(l, l.id)));

  const mudar = (chave: string, parcial: Partial<Linha>) =>
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...parcial } : l)));
  const adicionar = () =>
    setLinhas((atual) => [
      ...atual,
      {
        chave: novaChave(),
        areaFuncao: "",
        nome: "",
        especialidade: "",
        descritivo: "",
        empresa: empresaPadrao,
        email: "",
        celular: "",
        incluirNoRelatorio: true,
        ordem: String(atual.length + 1),
      },
    ]);
  const remover = (chave: string) => setLinhas((atual) => atual.filter((l) => l.chave !== chave));

  const json = JSON.stringify(
    linhas.map((l) => ({ ...l, ordem: l.ordem.trim() === "" ? null : Number(l.ordem) })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="linhas" value={json} />

      {linhas.length === 0 && (
        <p className="text-sm text-zinc-500">Nenhum responsável cadastrado. Use &ldquo;Adicionar responsável&rdquo;.</p>
      )}

      {linhas.map((l, i) => {
        const rotulo = (campo: string) => `${campo} (responsável ${i + 1})`;
        return (
          <fieldset key={l.chave} className="rounded-lg border border-zinc-200 p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-medium text-zinc-500">Responsável {i + 1}</legend>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Área / Função
              <Input
                value={l.areaFuncao}
                onChange={(e) => mudar(l.chave, { areaFuncao: e.target.value })}
                maxLength={LIMITES_RESPONSAVEL.areaFuncao}
                aria-label={rotulo("Área / Função")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Nome
              <Input
                value={l.nome}
                onChange={(e) => mudar(l.chave, { nome: e.target.value })}
                maxLength={LIMITES_RESPONSAVEL.nome}
                aria-label={rotulo("Nome")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Especialidade
              <Input
                value={l.especialidade}
                onChange={(e) => mudar(l.chave, { especialidade: e.target.value })}
                maxLength={LIMITES_RESPONSAVEL.especialidade}
                aria-label={rotulo("Especialidade")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Empresa
              <Input
                value={l.empresa}
                onChange={(e) => mudar(l.chave, { empresa: e.target.value })}
                maxLength={LIMITES_RESPONSAVEL.empresa}
                aria-label={rotulo("Empresa")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 sm:col-span-2">
              Descritivo
              <Textarea
                value={l.descritivo}
                onChange={(e) => mudar(l.chave, { descritivo: e.target.value })}
                maxLength={LIMITES_RESPONSAVEL.descritivo}
                rows={2}
                aria-label={rotulo("Descritivo")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              E-mail
              <Input
                type="email"
                value={l.email}
                onChange={(e) => mudar(l.chave, { email: e.target.value })}
                maxLength={LIMITES_RESPONSAVEL.email}
                aria-label={rotulo("E-mail")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Celular
              <Input
                type="tel"
                value={l.celular}
                onChange={(e) => mudar(l.chave, { celular: e.target.value })}
                maxLength={LIMITES_RESPONSAVEL.celular}
                aria-label={rotulo("Celular")}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-zinc-800">
                <input
                  type="checkbox"
                  checked={l.incluirNoRelatorio}
                  onChange={(e) => mudar(l.chave, { incluirNoRelatorio: e.target.checked })}
                  aria-label={rotulo("Consta no próximo relatório")}
                />
                Consta no próximo relatório
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                Ordem
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={l.ordem}
                  onChange={(e) => mudar(l.chave, { ordem: e.target.value })}
                  className="w-20"
                  aria-label={rotulo("Ordem")}
                />
              </label>
              <button
                type="button"
                onClick={() => remover(l.chave)}
                className="ml-auto text-sm text-red-600 underline-offset-2 hover:underline cursor-pointer"
              >
                Remover
              </button>
            </div>
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={adicionar}>
          Adicionar responsável
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar responsáveis"}
        </Button>
        {estado?.erro && <FieldError>{estado.erro}</FieldError>}
        {estado?.sucesso && <p className="text-sm text-emerald-700">{estado.sucesso}</p>}
      </div>
    </form>
  );
}
