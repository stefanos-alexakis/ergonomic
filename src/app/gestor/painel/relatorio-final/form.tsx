"use client";

import { useActionState, useState } from "react";
import { emitirRelatorioFinalAction, salvarRelatorioFinalAction, type EstadoRelatorioFinal } from "./actions";
import { Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

type Opcao = { id: string; nome: string };

export type ValoresRelatorioFinal = {
  pesquisaId: string | null;
  avaliacaoId: string | null;
  levantamentoId: string | null;
  conclusao: string;
  cruzamentoAnalitico: string;
  resumoEixo2: string;
  observacaoEixo2: string;
  fontesInternas: string;
};

export type PadroesRelatorioFinal = { resumoEixo2: string; observacaoEixo2: string; fontesInternas: string };

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

function CampoTexto({
  nome,
  titulo,
  ajuda,
  valor,
  setValor,
  padrao,
  linhas,
}: {
  nome: string;
  titulo: string;
  ajuda: string;
  valor: string;
  setValor: (v: string) => void;
  padrao?: string;
  linhas: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-zinc-900">
      {titulo}
      <span className="text-xs font-normal text-zinc-500">{ajuda}</span>
      <Textarea name={nome} rows={linhas} value={valor} onChange={(e) => setValor(e.target.value)} aria-label={titulo} />
      {padrao !== undefined && valor.trim() !== padrao.trim() && (
        <button
          type="button"
          onClick={() => setValor(padrao)}
          className="self-start text-xs font-normal text-zinc-600 underline underline-offset-2 hover:text-zinc-900 cursor-pointer"
        >
          Voltar ao texto gerado pelo sistema
        </button>
      )}
    </label>
  );
}

/** Rascunho do relatório final (modelo da cliente) — só a consultoria vê este formulário. */
export function RelatorioFinalForm({
  valores,
  padroes,
  pesquisas,
  avaliacoes,
  levantamentos,
  proximaVersao,
}: {
  valores: ValoresRelatorioFinal;
  padroes: PadroesRelatorioFinal;
  pesquisas: Opcao[];
  avaliacoes: Opcao[];
  levantamentos: Opcao[];
  proximaVersao: number;
}) {
  const [salvo, salvar, salvando] = useActionState<EstadoRelatorioFinal, FormData>(salvarRelatorioFinalAction, undefined);
  const [emitido, emitir, emitindo] = useActionState<EstadoRelatorioFinal, FormData>(emitirRelatorioFinalAction, undefined);
  // Controlados: o React 19 limpa o formulário depois de cada envio.
  const [conclusao, setConclusao] = useState(valores.conclusao);
  const [cruzamento, setCruzamento] = useState(valores.cruzamentoAnalitico);
  const [resumo, setResumo] = useState(valores.resumoEixo2);
  const [observacao, setObservacao] = useState(valores.observacaoEixo2);
  const [fontes, setFontes] = useState(valores.fontesInternas);
  const pendente = salvando || emitindo;
  const ajudaTexto = "Linha em branco separa parágrafos; “# ” no início vira subtítulo e “- ” vira item de lista.";

  return (
    <form action={salvar} className="flex flex-col gap-5 rounded-lg border border-zinc-200 p-4">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-zinc-900">Fontes (as mesmas do relatório completo)</legend>
        <Fonte nome="pesquisaId" rotulo="Eixo 1 · Pesquisa" opcoes={pesquisas} valor={valores.pesquisaId} />
        <Fonte nome="avaliacaoId" rotulo="Eixo 2 · Avaliação" opcoes={avaliacoes} valor={valores.avaliacaoId} />
        <Fonte nome="levantamentoId" rotulo="Eixo 3 · Levantamento" opcoes={levantamentos} valor={valores.levantamentoId} />
      </fieldset>

      <CampoTexto
        nome="resumoEixo2"
        titulo="Eixo 2 · Resumo executivo"
        ajuda={`Gerado pelo sistema a partir das respostas; edite se quiser. ${ajudaTexto}`}
        valor={resumo}
        setValor={setResumo}
        padrao={padroes.resumoEixo2}
        linhas={7}
      />
      <CampoTexto
        nome="observacaoEixo2"
        titulo="Eixo 2 · Observação interpretativa"
        ajuda="Gerada pelo sistema; edite se quiser."
        valor={observacao}
        setValor={setObservacao}
        padrao={padroes.observacaoEixo2}
        linhas={4}
      />
      <CampoTexto
        nome="cruzamentoAnalitico"
        titulo="Cruzamento analítico dos Eixos 1, 2 e 3"
        ajuda={`Texto do consultor: o que a validação com a empresa confirmou ou não. Abaixo dele o relatório mostra a síntese dos resultados, o resultado geral e a conta de cada setor. ${ajudaTexto}`}
        valor={cruzamento}
        setValor={setCruzamento}
        linhas={12}
      />
      <CampoTexto
        nome="conclusao"
        titulo="Conclusão"
        ajuda={`A mesma do relatório completo. ${ajudaTexto}`}
        valor={conclusao}
        setValor={setConclusao}
        linhas={10}
      />
      <CampoTexto
        nome="fontesInternas"
        titulo="Referências · documentos internos e fontes primárias"
        ajuda="Gerado pelo sistema a partir das fontes escolhidas; acrescente documentos (organograma, registros de banco de horas…)."
        valor={fontes}
        setValor={setFontes}
        padrao={padroes.fontesInternas}
        linhas={5}
      />

      <p className="text-xs text-zinc-500">
        Quem consta e assina vem do cadastro da empresa (Editar empresa → Responsáveis do relatório).
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pendente}>
          {salvando ? "Salvando..." : "Salvar rascunho"}
        </Button>
        <a
          href="/gestor/painel/relatorio-final/previa"
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
