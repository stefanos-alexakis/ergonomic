"use client";

import { useActionState, useState } from "react";
import { emitirRelatorioAction, salvarRascunhoAction, type EstadoRelatorio } from "./actions";
import { Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

type Opcao = { id: string; nome: string };

export type ValoresRascunho = {
  pesquisaId: string | null;
  avaliacaoId: string | null;
  levantamentoId: string | null;
  conclusao: string;
  consultorIds: string[];
};

function Fonte({ nome, rotulo, opcoes, valor }: { nome: string; rotulo: string; opcoes: Opcao[]; valor: string | null }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
      {rotulo}
      <Select name={nome} defaultValue={valor ?? ""}>
        <option value="">Mais recente</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
        <option value="nenhum">Não considerar</option>
      </Select>
    </label>
  );
}

/** Rascunho do relatório completo — só a consultoria vê este formulário. */
export function RascunhoForm({
  valores,
  pesquisas,
  avaliacoes,
  levantamentos,
  consultores,
  proximaVersao,
}: {
  valores: ValoresRascunho;
  pesquisas: Opcao[];
  avaliacoes: Opcao[];
  levantamentos: Opcao[];
  consultores: (Opcao & { detalhe: string })[];
  proximaVersao: number;
}) {
  const [salvo, salvar, salvando] = useActionState<EstadoRelatorio, FormData>(salvarRascunhoAction, undefined);
  const [emitido, emitir, emitindo] = useActionState<EstadoRelatorio, FormData>(emitirRelatorioAction, undefined);
  // Controlado: o React 19 limpa o formulário depois de cada envio.
  const [conclusao, setConclusao] = useState(valores.conclusao);
  const [assinam, setAssinam] = useState<string[]>(valores.consultorIds);
  const pendente = salvando || emitindo;

  return (
    <form action={salvar} className="flex flex-col gap-5 rounded-lg border border-zinc-200 p-4">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-zinc-900">Fontes</legend>
        <Fonte nome="pesquisaId" rotulo="Eixo 1 · Pesquisa" opcoes={pesquisas} valor={valores.pesquisaId} />
        <Fonte nome="avaliacaoId" rotulo="Eixo 2 · Avaliação" opcoes={avaliacoes} valor={valores.avaliacaoId} />
        <Fonte nome="levantamentoId" rotulo="Eixo 3 · Levantamento" opcoes={levantamentos} valor={valores.levantamentoId} />
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-900">
        Conclusão do consultor
        <span className="text-xs font-normal text-zinc-500">
          Texto livre. Linha em branco separa parágrafos; “# ” no início vira subtítulo e “- ” vira item de lista.
        </span>
        <Textarea
          name="conclusao"
          rows={14}
          value={conclusao}
          onChange={(e) => setConclusao(e.target.value)}
          aria-label="Conclusão do consultor"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-zinc-900">Quem assina</legend>
        {consultores.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum consultor cadastrado (Administração → Consultores).</p>
        ) : (
          <div className="flex flex-col gap-2">
            {consultores.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="consultorIds"
                  value={c.id}
                  checked={assinam.includes(c.id)}
                  onChange={(e) => setAssinam((a) => (e.target.checked ? [...a, c.id] : a.filter((x) => x !== c.id)))}
                  className="mt-1 h-4 w-4 cursor-pointer"
                />
                <span>
                  <strong>{c.nome}</strong>
                  {c.detalhe && <span className="block text-xs text-zinc-500">{c.detalhe}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pendente}>
          {salvando ? "Salvando..." : "Salvar rascunho"}
        </Button>
        <a
          href="/gestor/painel/relatorio-completo/previa"
          target="_blank"
          rel="noopener"
          className="text-sm font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
        >
          Pré-visualizar PDF (rascunho salvo)
        </a>
        <Button
          type="submit"
          formAction={emitir}
          disabled={pendente}
          className="ml-auto"
          onClick={(e) => {
            if (!window.confirm(`Emitir a versão ${proximaVersao}? O PDF fica gravado e não pode ser alterado depois.`)) e.preventDefault();
          }}
        >
          {emitindo ? "Gerando o PDF..." : `Emitir versão ${proximaVersao}`}
        </Button>
      </div>
      {[salvo, emitido].map((e, i) =>
        e?.erro ? (
          <FieldError key={i}>{e.erro}</FieldError>
        ) : e?.sucesso ? (
          <p key={i} className="text-sm text-emerald-700">
            {e.sucesso}
          </p>
        ) : null,
      )}
    </form>
  );
}
