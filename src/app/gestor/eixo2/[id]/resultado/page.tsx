import Link from "next/link";
import { calcularResultado } from "@/lib/avaliacao-eixo2";
import {
  classificarFatorEixo2,
  formatarFator,
  indiceControle,
  ROTULO_CONDICAO,
} from "@/lib/eixo2";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { contextoAvaliacao } from "../../contexto";
import {
  PERGUNTA_SINAIS,
  VALOR_DESTAQUE_SINAL,
  VALOR_PADRAO_SINAL,
  calcularResultadoSinais,
  rotuloSinal,
} from "@/lib/sinais-eixo2";

export const dynamic = "force-dynamic";

const COR_CELULA = {
  BOM: "bg-emerald-50 text-emerald-800",
  REGULAR: "bg-amber-50 text-amber-800",
  RUIM: "bg-red-50 text-red-800",
} as const;

function CelulaFator({ fator }: { fator: number | null }) {
  if (fator === null) return <span className="text-zinc-300">—</span>;
  const { classe, rotulo } = classificarFatorEixo2(fator);
  return (
    <span
      className={`inline-block min-w-14 rounded px-1.5 py-0.5 text-center text-xs font-medium tabular-nums ${COR_CELULA[classe]}`}
      title={rotulo}
    >
      {formatarFator(fator)}
    </span>
  );
}

export default async function ResultadoEixo2Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setor?: string }>;
}) {
  const { id } = await params;
  const { setor: setorFiltro } = await searchParams;
  const { actor, workspace, avaliacao, setores } = await contextoAvaliacao(id);

  const visiveis = setorFiltro ? setores.filter((s) => s.id === setorFiltro) : setores;
  const { dimensoes, linhas, planos } = await calcularResultado(avaliacao.id, avaliacao.questionarioId, visiveis);
  const parcial = linhas.some((l) => !l.completo);
  const nomeFiltro = setores.find((s) => s.id === setorFiltro)?.nome;
  const sinais = await calcularResultadoSinais(avaliacao.id, visiveis);
  const algumSinal = Object.values(sinais.identificadosPorSetor).some((n) => n > 0);
  const planosVisiveis = nomeFiltro ? planos.filter((p) => p.setor === nomeFiltro) : planos;

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader
        eyebrow={`Eixo 2 · ${avaliacao.nome}`}
        title="Resultado das medidas de controle"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/gestor/eixo2/como-funciona">
              <Button variant="secondary">Entenda o score do Eixo 2</Button>
            </Link>
            <a href={`/gestor/eixo2/${avaliacao.id}/resultado/relatorio-pdf`}>
              <Button variant="secondary">Relatório do Eixo 2 (PDF)</Button>
            </a>
            <Link href={`/gestor/eixo2/${avaliacao.id}`}>
              <Button variant="secondary">{avaliacao.status === "CONCLUIDA" ? "Ver respostas" : "Continuar preenchendo"}</Button>
            </Link>
          </div>
        }
      />

      {parcial && (
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Avaliação ainda incompleta — os números abaixo são parciais.
        </p>
      )}

      <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600 max-w-3xl">
        <p>
          Cada medida vale <strong>0,80</strong> (existente e eficaz ou não se aplica), <strong>0,90</strong> (precisa
          melhorar) ou <strong>1,00</strong> (inexistente). O <strong>fator do Eixo 2</strong> é a média das medidas de
          cada fator de risco no setor: quanto menor, mais as medidas <strong>atenuam</strong> o risco do Eixo 1, e{" "}
          <strong>1,00 significa nenhuma atenuação</strong>. Ele multiplica o resultado do Eixo 1 no score final.
        </p>
        <p className="mt-2">
          O <strong>índice de controle</strong> é o mesmo fator em porcentagem: <strong>100%</strong> = ×0,80 (todas as
          medidas existem e são eficazes) e <strong>0%</strong> = ×1,00 (nenhuma medida). <Badge tom="sucesso">Bom</Badge>{" "}
          até ×0,85 · <Badge tom="atencao">Regular</Badge> até ×0,95 · <Badge tom="perigo">Ruim</Badge> acima disso.{" "}
          <Link href="/gestor/eixo2/como-funciona" className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline">
            Entenda o score do Eixo 2
          </Link>
          .
        </p>
      </div>

      <form method="get" className="flex items-end gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="setor" className="text-xs font-medium text-zinc-500">
            Setor
          </label>
          <Select id="setor" name="setor" defaultValue={setorFiltro ?? ""} className="w-56">
            <option value="">Todos</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Resumo por setor</h2>
        <Table>
          <Thead>
            <Tr>
              <Th>Setor</Th>
              <Th>Fator do Eixo 2</Th>
              <Th>Índice de controle</Th>
              <Th>Classificação</Th>
            </Tr>
          </Thead>
          <tbody>
            {linhas.map((l) => {
              const classe = l.geral !== null ? classificarFatorEixo2(l.geral) : null;
              return (
                <Tr key={l.setor.id}>
                  <Td className="font-medium text-zinc-900">{l.setor.nome}</Td>
                  <Td>
                    <CelulaFator fator={l.geral} />
                  </Td>
                  <Td className="tabular-nums">{l.geral !== null ? `${indiceControle(l.geral)}%` : "—"}</Td>
                  <Td>{classe ? <Badge tom={classe.tom}>{classe.rotulo}</Badge> : "—"}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Por fator de risco</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="sticky left-0 bg-zinc-50 px-3 py-2 text-left font-medium">Fator</th>
                {linhas.map((l) => (
                  <th key={l.setor.id} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                    {l.setor.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensoes.map((d) => (
                <tr key={d.id} className="border-t border-zinc-100">
                  <td className="sticky left-0 bg-white px-3 py-2 text-zinc-700" title={d.fator}>
                    {d.nome}
                  </td>
                  {linhas.map((l) => (
                    <td key={l.setor.id} className="px-3 py-2 text-center">
                      <CelulaFator fator={l.porDimensao[d.id] ?? null} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10" aria-label="Sinais de exposição (ISO 45003)">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Sinais de exposição a riscos psicossociais (ISO 45003)</h2>
        <p className="text-xs text-zinc-500 mb-3 max-w-3xl">
          {PERGUNTA_SINAIS} Indicador à parte, identificado pelo líder de cada setor: <strong>não entra</strong> no fator do
          Eixo 2 nem no índice final. Em destaque, Frequentemente e Sempre.
        </p>
        {!sinais.revisado && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="sinais-nao-revisados">
            {algumSinal
              ? "A revisão desta etapa ainda não foi confirmada — o “Nunca” é apenas o valor padrão."
              : "Esta avaliação não passou pela etapa dos sinais de exposição (ISO 45003): nada foi avaliado, e o “Nunca” abaixo é só o valor padrão."}
          </p>
        )}
        {(sinais.revisado || algumSinal) && (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm" data-testid="matriz-sinais">
                <thead className="bg-zinc-50 text-xs text-zinc-500">
                  <tr>
                    <th className="sticky left-0 bg-zinc-50 px-3 py-2 text-left font-medium">Sinal</th>
                    {sinais.setores.map((st) => (
                      <th key={st.id} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                        {st.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sinais.sinais.map((sinal) => (
                    <tr key={sinal.id} className="border-t border-zinc-100">
                      <td className="sticky left-0 bg-white px-3 py-2 text-zinc-700 min-w-72">
                        <span className="text-zinc-400">{sinal.ordem}.</span> {sinal.texto}
                      </td>
                      {sinais.setores.map((st) => {
                        const v = sinais.valores[`${sinal.id}:${st.id}`] ?? VALOR_PADRAO_SINAL;
                        const cor =
                          v >= VALOR_DESTAQUE_SINAL
                            ? "bg-red-50 font-semibold text-red-800"
                            : v > VALOR_PADRAO_SINAL
                              ? "bg-amber-50 text-amber-800"
                              : "text-zinc-400";
                        return (
                          <td key={st.id} className={`px-3 py-2 text-center whitespace-nowrap ${cor}`} data-valor={v}>
                            {rotuloSinal(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-200 bg-zinc-50 text-xs text-zinc-600">
                    <td className="px-3 py-2 font-medium">Sinais identificados no setor</td>
                    {sinais.setores.map((st) => (
                      <td key={st.id} className="px-3 py-2 text-center tabular-nums">
                        {sinais.identificadosPorSetor[st.id] ?? 0} de {sinais.sinais.length}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="mt-2 text-sm">
              <a
                href={`/gestor/eixo2/${avaliacao.id}/resultado/sinais-excel`}
                className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
              >
                Baixar Excel dos sinais
              </a>
            </p>
          </>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Planos de ação ({planosVisiveis.length})</h2>
        {planosVisiveis.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum plano de ação registrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {planosVisiveis.map((p, i) => (
              <article key={i} className="rounded-lg border border-zinc-200 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mb-1">
                  <span className="font-semibold text-zinc-800">{p.setor}</span>
                  <span>·</span>
                  <span>{p.dimensao}</span>
                  <span>·</span>
                  <span>{ROTULO_CONDICAO[p.condicao]}</span>
                </div>
                <p className="text-sm text-zinc-700 mb-2">
                  <span className="text-zinc-400">{p.ordem}.</span> {p.questao}
                </p>
                <p className="text-sm text-zinc-900 whitespace-pre-line">{p.plano}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </ShellGestor>
  );
}
