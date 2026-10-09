import Link from "next/link";
import { db } from "@/lib/db";
import { calcularPainelFrprt } from "@/lib/painel-frprt";
import { listarAcoes, pendenciasDoPgr, type AcaoCompleta } from "@/lib/plano-acao";
import {
  FASES,
  SITUACOES,
  formatarDia,
  formatarReais,
  hojeIso,
  situacaoDaAcao,
  type Fase,
  type Situacao,
} from "@/lib/plano-acao-util";
import { PRIORIDADES, type Prioridade } from "@/lib/fmea";
import { formatarRisco } from "@/lib/score-final";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, Input } from "@/components/ui/input";
import { contextoGestor } from "../eixo2/contexto";
import { PilulaPrioridade } from "../painel/fmea";
import { FormGerar } from "./controles";
import { fatoresAtivos, setoresDaEmpresa } from "./dados";
import { filtrar, type Filtros } from "./filtros";

export const dynamic = "force-dynamic";

function Resumo({ acoes, hoje }: { acoes: AcaoCompleta[]; hoje: string }) {
  const sit = (s: Situacao) => acoes.filter((a) => situacaoDaAcao(a, hoje) === s).length;
  const abertas = acoes.filter((a) => a.fase !== "CONCLUIDA" && a.fase !== "CANCELADA");
  const custo = abertas.reduce((t, a) => t + (a.custoCentavos ?? 0), 0);
  const eficazes = acoes.filter((a) => a.eficacia === "EFICAZ").length;
  const itens: [string, string | number, string?][] = [
    ["ações abertas", abertas.length],
    ["atrasadas", sit("ATRASADA"), "text-red-700"],
    ["vencem em 30 dias", sit("VENCE_EM_BREVE"), "text-amber-700"],
    ["concluídas", sit("CONCLUIDA")],
    ["eficazes", eficazes, "text-emerald-700"],
    ["custo das abertas", formatarReais(custo)],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {itens.map(([rotulo, valor, cor]) => (
        <div key={rotulo} className="rounded-lg border border-zinc-200 px-3 py-2">
          <p className={`text-xl font-bold tabular-nums ${cor ?? "text-zinc-900"}`}>{valor}</p>
          <p className="text-xs text-zinc-500">{rotulo}</p>
        </div>
      ))}
    </div>
  );
}

function LinhaAcao({ a, hoje }: { a: AcaoCompleta; hoje: string }) {
  const s = situacaoDaAcao(a, hoje);
  return (
    <tr className="border-t border-zinc-100 align-top">
      <td className="px-3 py-3 text-zinc-500 tabular-nums">#{a.numero}</td>
      <td className="px-3 py-3">
        <Link href={`/gestor/plano/${a.id}`} className="font-medium text-zinc-900 hover:underline">
          {a.oque}
        </Link>
        <p className="text-xs text-zinc-500 mt-0.5">
          {a.dimensao?.nome ?? "Sem fator"} · {a.setores.map((x) => x.setor.nome).join(", ") || "sem setor"}
        </p>
      </td>
      <td className="px-3 py-3">{a.prioridade ? <PilulaPrioridade prioridade={a.prioridade as Prioridade} /> : <span className="text-zinc-300">—</span>}</td>
      <td className="px-3 py-3 text-sm text-zinc-700">{a.responsavel ?? <span className="text-zinc-400">definir</span>}</td>
      <td className="px-3 py-3 text-sm tabular-nums">{formatarDia(a.prazo)}</td>
      <td className="px-3 py-3 text-xs">
        <span className="font-semibold text-zinc-700">{FASES[a.fase as Fase].letra}</span> · {FASES[a.fase as Fase].rotulo}
        {a.fase === "EXECUTAR" && <span className="text-zinc-400"> · {a.percentual}%</span>}
      </td>
      <td className="px-3 py-3">
        <Badge tom={SITUACOES[s].tom}>{SITUACOES[s].rotulo}</Badge>
      </td>
    </tr>
  );
}

function Quadro({ acoes, hoje }: { acoes: AcaoCompleta[]; hoje: string }) {
  const colunas: Fase[] = ["PLANEJAR", "EXECUTAR", "VERIFICAR", "CONCLUIDA"];
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {colunas.map((fase) => {
        const lista = acoes.filter((a) => a.fase === fase);
        return (
          <section key={fase} className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 flex flex-col gap-2 min-w-0" aria-label={`Coluna ${FASES[fase].rotulo}`}>
            <h3 className="text-sm font-semibold text-zinc-800">
              {FASES[fase].letra} · {FASES[fase].rotulo} <span className="text-zinc-400 font-normal">({lista.length})</span>
            </h3>
            {lista.map((a) => {
              const s = situacaoDaAcao(a, hoje);
              return (
                <Link key={a.id} href={`/gestor/plano/${a.id}`} className="rounded-md border border-zinc-200 bg-white p-3 hover:border-zinc-400 flex flex-col gap-1">
                  <span className="text-xs text-zinc-400">#{a.numero}</span>
                  <span className="text-sm font-medium text-zinc-900 line-clamp-3">{a.oque}</span>
                  <span className="text-xs text-zinc-500">{a.setores.map((x) => x.setor.nome).join(", ")}</span>
                  <span className="flex flex-wrap items-center gap-1.5 mt-1">
                    {a.prioridade && <PilulaPrioridade prioridade={a.prioridade as Prioridade} />}
                    <Badge tom={SITUACOES[s].tom}>{SITUACOES[s].rotulo}</Badge>
                  </span>
                </Link>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

export default async function PlanoPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const f = await searchParams;
  const { actor, workspace } = await contextoGestor();
  const hoje = hojeIso();
  const [acoes, painel, avaliacoes, fatores, setores] = await Promise.all([
    listarAcoes(workspace.id),
    calcularPainelFrprt(workspace.id, {}, {}),
    db.avaliacaoEixo2.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: { id: true, nome: true, status: true },
    }),
    fatoresAtivos(),
    setoresDaEmpresa(workspace.id),
  ]);
  const filtradas = filtrar(acoes, f, hoje);
  const pendencias = painel ? pendenciasDoPgr(painel) : [];
  const temFiltro = Boolean(f.setor || f.fator || f.fase || f.situacao || f.prioridade || f.q);
  const quadro = f.visao === "quadro";
  const query = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...f, ...extra }).filter(([, v]) => v) as [string, string][]);
    return p.toString() ? `?${p}` : "";
  };

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader
        eyebrow="Gestão · 5W2H e PDCA"
        title="Plano de ação"
        actions={
          <>
            <a href={`/gestor/plano/exportar${query({ formato: "xlsx" })}`}>
              <Button variant="secondary">Exportar Excel</Button>
            </a>
            <a href={`/gestor/plano/exportar${query({ formato: "pdf" })}`}>
              <Button variant="secondary">Exportar PDF</Button>
            </a>
            <Link href="/gestor/plano/nova">
              <Button>+ Nova ação</Button>
            </Link>
          </>
        }
      />

      <Resumo acoes={acoes} hoje={hoje} />

      <div className="mb-6 rounded-lg border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Gerar a partir do Eixo 2</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Cada plano de ação escrito no Eixo 2 vira uma ação (planos iguais em vários setores viram uma ação só). Gerar de novo
          não duplica nem apaga o que já foi editado; ações canceladas não voltam.
        </p>
        <FormGerar avaliacoes={avaliacoes.map((a) => ({ id: a.id, nome: a.nome, concluida: a.status === "CONCLUIDA" }))} />
      </div>

      {pendencias.length > 0 && (
        <section className="mb-6 rounded-lg border border-red-200 bg-red-50/40 p-4" aria-label="Riscos do PGR sem ação">
          <h2 className="text-sm font-semibold text-red-800 mb-2">Riscos do PGR sem ação — situações ({pendencias.length})</h2>
          <ul className="flex flex-col gap-2">
            {pendencias.map((p) => (
              <li key={`${p.setorId}-${p.situacao!.perguntaId}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <PilulaPrioridade prioridade={p.fmea.prioridade} />
                  {p.setor} · {p.situacao!.numero}. {p.situacao!.texto}
                  <span className="text-xs text-zinc-500 tabular-nums">índice {formatarRisco(p.celula.final!)}</span>
                </span>
                <Link
                  href={`/gestor/plano/nova?setor=${p.setorId}&fator=${p.fator.id}&situacao=${p.situacao!.perguntaId}&prioridade=${p.fmea.prioridade}`}
                  className="text-sm font-medium text-zinc-900 underline hover:no-underline"
                >
                  Criar ação
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <Select name="setor" defaultValue={f.setor ?? ""} className="w-40" aria-label="Filtrar por setor">
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </Select>
        <Select name="fator" defaultValue={f.fator ?? ""} className="w-48" aria-label="Filtrar por fator">
          <option value="">Todos os fatores</option>
          {fatores.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
        </Select>
        <Select name="fase" defaultValue={f.fase ?? ""} className="w-40" aria-label="Filtrar por fase">
          <option value="">Todas as fases</option>
          {(Object.keys(FASES) as Fase[]).map((x) => (
            <option key={x} value={x}>
              {FASES[x].rotulo}
            </option>
          ))}
        </Select>
        <Select name="situacao" defaultValue={f.situacao ?? ""} className="w-44" aria-label="Filtrar por situação">
          <option value="">Todas as situações</option>
          {(Object.keys(SITUACOES) as Situacao[]).map((x) => (
            <option key={x} value={x}>
              {SITUACOES[x].rotulo}
            </option>
          ))}
        </Select>
        <Select name="prioridade" defaultValue={f.prioridade ?? ""} className="w-36" aria-label="Filtrar por prioridade">
          <option value="">Toda prioridade</option>
          {(Object.keys(PRIORIDADES) as Prioridade[]).map((x) => (
            <option key={x} value={x}>
              {PRIORIDADES[x].rotulo}
            </option>
          ))}
        </Select>
        <Input name="q" defaultValue={f.q ?? ""} placeholder="Buscar ação ou responsável" className="w-56" aria-label="Buscar" />
        {quadro && <input type="hidden" name="visao" value="quadro" />}
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
        {temFiltro && (
          <Link href={`/gestor/plano${quadro ? "?visao=quadro" : ""}`} className="text-sm text-zinc-500 hover:text-zinc-900 self-center">
            Limpar
          </Link>
        )}
        <span className="ml-auto flex gap-1 text-sm">
          <Link href={`/gestor/plano${query({ visao: undefined })}`} className={`rounded-md px-3 py-1.5 ${!quadro ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
            Lista
          </Link>
          <Link href={`/gestor/plano${query({ visao: "quadro" })}`} className={`rounded-md px-3 py-1.5 ${quadro ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
            Quadro PDCA
          </Link>
        </span>
      </form>

      {acoes.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-6 text-sm text-zinc-600">
          Nenhuma ação ainda. Gere a partir dos planos escritos no Eixo 2 ou crie uma ação nova.
        </p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma ação com esses filtros.</p>
      ) : quadro ? (
        <Quadro acoes={filtradas} hoje={hoje} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm" aria-label="Ações do plano">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">O quê · fator · onde</th>
                <th className="px-3 py-2 text-left font-medium">Prioridade</th>
                <th className="px-3 py-2 text-left font-medium">Quem</th>
                <th className="px-3 py-2 text-left font-medium">Prazo</th>
                <th className="px-3 py-2 text-left font-medium">PDCA</th>
                <th className="px-3 py-2 text-left font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((a) => (
                <LinhaAcao key={a.id} a={a} hoje={hoje} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ShellGestor>
  );
}
