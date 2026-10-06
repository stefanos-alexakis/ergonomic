import Link from "next/link";
import { notFound } from "next/navigation";
import { calcularPainelFrprt } from "@/lib/painel-frprt";
import { TRANSICOES, antesDepois, obterAcao } from "@/lib/plano-acao";
import {
  EFICACIAS,
  FASES,
  SITUACOES,
  dataIso,
  formatarDia,
  hojeIso,
  reaisParaCampo,
  situacaoDaAcao,
  type Eficacia,
  type Fase,
} from "@/lib/plano-acao-util";
import { formatarRisco } from "@/lib/score-final";
import { type Prioridade } from "@/lib/fmea";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { contextoGestor } from "../../eixo2/contexto";
import { PilulaPrioridade } from "../../painel/fmea";
import { FormularioAcao } from "../formulario-acao";
import { BotoesFase, FormAndamento, FormVerificacao } from "../controles";
import { fatoresAtivos, setoresDaEmpresa } from "../dados";

export const dynamic = "force-dynamic";

const ETAPAS: Fase[] = ["PLANEJAR", "EXECUTAR", "VERIFICAR", "CONCLUIDA"];

export default async function AcaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, workspace } = await contextoGestor();
  const acao = await obterAcao(id, workspace.id);
  if (!acao) notFound();

  const [fatores, setores, painel] = await Promise.all([
    fatoresAtivos(),
    setoresDaEmpresa(workspace.id),
    acao.fase === "VERIFICAR" || acao.fase === "CONCLUIDA" ? calcularPainelFrprt(workspace.id, {}, {}) : Promise.resolve(null),
  ]);
  const fase = acao.fase as Fase;
  const situacao = situacaoDaAcao(acao, hojeIso());
  const versao = acao.atualizadoEm.toISOString();
  const comparacao = painel ? antesDepois(acao, painel) : [];
  const indiceEtapa = ETAPAS.indexOf(fase);

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader
        eyebrow={
          <>
            Plano de ação · ação #{acao.numero}
            {acao.acaoOrigem && (
              <>
                {" "}· corretiva de{" "}
                <Link href={`/gestor/plano/${acao.acaoOrigem.id}`} className="underline">
                  #{acao.acaoOrigem.numero}
                </Link>
              </>
            )}
          </>
        }
        title={acao.oque.length > 90 ? `${acao.oque.slice(0, 87)}…` : acao.oque}
        actions={
          <span className="flex items-center gap-2">
            {acao.prioridade && <PilulaPrioridade prioridade={acao.prioridade as Prioridade} />}
            <Badge tom={SITUACOES[situacao].tom}>{SITUACOES[situacao].rotulo}</Badge>
          </span>
        }
      />

      {/* Trilha do PDCA */}
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Etapas do PDCA">
        {ETAPAS.map((e, i) => {
          const feita = fase !== "CANCELADA" && i < indiceEtapa;
          const atual = e === fase;
          return (
            <li
              key={e}
              aria-current={atual ? "step" : undefined}
              className={`rounded-md border px-3 py-2 text-xs ${
                atual ? "border-[var(--ws-accent,#18181b)] bg-[var(--ws-accent,#18181b)] text-[var(--ws-on-accent,#fff)]" : feita ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-zinc-200 text-zinc-500"
              }`}
            >
              <span className="font-bold">{FASES[e].letra}</span> · {FASES[e].rotulo}
            </li>
          );
        })}
      </ol>
      {fase === "CANCELADA" && (
        <p className="mb-6 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Ação cancelada.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-8 items-start">
        <div className="flex flex-col gap-8 min-w-0">
          {/* Por quê automático */}
          <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 flex flex-col gap-1">
            <p>
              <strong>Fator:</strong> {acao.dimensao?.nome ?? "sem fator específico"}
              {acao.prioridade && (
                <>
                  {" "}· <strong>prioridade FMEA:</strong> <PilulaPrioridade prioridade={acao.prioridade as Prioridade} />
                </>
              )}
            </p>
            {acao.questaoEixo2 && (
              <p>
                <strong>Origem:</strong> plano de ação do Eixo 2
                {acao.origemAvaliacao ? ` (avaliação "${acao.origemAvaliacao.nome}")` : ""} — questão {acao.questaoEixo2.ordem}.
              </p>
            )}
            {acao.setores.some((s) => s.indiceBase !== null) && (
              <p>
                <strong>Índice quando a ação foi criada:</strong>{" "}
                {acao.setores
                  .filter((s) => s.indiceBase !== null)
                  .map((s) => `${s.setor.nome} ${formatarRisco(s.indiceBase!)}`)
                  .join(" · ")}
              </p>
            )}
          </section>

          {/* Verificação (C) e resultado (A) */}
          {(fase === "VERIFICAR" || fase === "CONCLUIDA") && (
            <section className="rounded-lg border border-zinc-200 p-4 flex flex-col gap-4" aria-label="Verificação de eficácia">
              <h2 className="text-sm font-semibold text-zinc-900">Verificação de eficácia · antes × depois</h2>
              {comparacao.length === 0 || !acao.dimensaoId ? (
                <p className="text-sm text-zinc-500">Sem fator ou setor vinculado: verifique pela evidência descrita.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr>
                      <th className="text-left font-medium py-1">Setor</th>
                      <th className="text-right font-medium py-1">Antes</th>
                      <th className="text-right font-medium py-1">Agora</th>
                      <th className="text-right font-medium py-1">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparacao.map((c) => (
                      <tr key={c.setor} className="border-t border-zinc-100">
                        <td className="py-1.5">{c.setor}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.antes !== null ? formatarRisco(c.antes) : "—"}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {c.suprimido ? <span className="text-zinc-400">amostra insuficiente</span> : c.depois !== null ? formatarRisco(c.depois) : "—"}
                        </td>
                        <td
                          className={`py-1.5 text-right tabular-nums font-semibold ${
                            c.variacao === null ? "text-zinc-400" : c.variacao < 0 ? "text-emerald-700" : c.variacao > 0 ? "text-red-700" : "text-zinc-600"
                          }`}
                        >
                          {c.variacao === null ? "—" : `${c.variacao > 0 ? "+" : ""}${formatarRisco(c.variacao)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="text-xs text-zinc-500">
                "Agora" é o Painel FRPRT com a pesquisa, a avaliação e o levantamento mais recentes. Queda no índice indica
                melhora.
              </p>
              {fase === "VERIFICAR" ? (
                <FormVerificacao acaoId={acao.id} versao={versao} />
              ) : (
                acao.eficacia && (
                  <div className="text-sm text-zinc-700 flex flex-col gap-1">
                    <p>
                      <strong>Eficácia:</strong>{" "}
                      <Badge tom={EFICACIAS[acao.eficacia as Eficacia].tom}>{EFICACIAS[acao.eficacia as Eficacia].rotulo}</Badge>
                      {acao.verificadaEm && <span className="text-zinc-500"> em {acao.verificadaEm.toLocaleDateString("pt-BR")}</span>}
                    </p>
                    {acao.verificacao && <p className="whitespace-pre-line">{acao.verificacao}</p>}
                    {acao.corretivas.length > 0 && (
                      <p>
                        <strong>Ação corretiva:</strong>{" "}
                        {acao.corretivas.map((c) => (
                          <Link key={c.id} href={`/gestor/plano/${c.id}`} className="underline mr-2">
                            #{c.numero}
                          </Link>
                        ))}
                      </p>
                    )}
                  </div>
                )
              )}
            </section>
          )}

          {/* Execução (D) */}
          {fase === "EXECUTAR" && (
            <section className="rounded-lg border border-zinc-200 p-4" aria-label="Andamento">
              <h2 className="text-sm font-semibold text-zinc-900 mb-3">Execução · {acao.percentual}% concluído</h2>
              <FormAndamento acaoId={acao.id} versao={versao} percentual={acao.percentual} />
            </section>
          )}

          {/* 5W2H */}
          <section aria-label="5W2H">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">5W2H</h2>
            <FormularioAcao
              acaoId={acao.id}
              versao={versao}
              somenteLeitura={fase === "CONCLUIDA" || fase === "CANCELADA"}
              valores={{
                oque: acao.oque,
                porque: acao.porque ?? "",
                como: acao.como ?? "",
                responsavel: acao.responsavel ?? "",
                cargoResponsavel: acao.cargoResponsavel ?? "",
                inicio: dataIso(acao.inicio),
                prazo: dataIso(acao.prazo),
                reavaliarEm: dataIso(acao.reavaliarEm),
                custo: reaisParaCampo(acao.custoCentavos),
                custoObservacao: acao.custoObservacao ?? "",
                dimensaoId: acao.dimensaoId ?? "",
                setorIds: acao.setores.map((s) => s.setorId),
              }}
              setores={setores}
              fatores={fatores}
            />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-zinc-200 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Próximo passo</h2>
            <p className="text-xs text-zinc-500 mb-3">{FASES[fase].descricao}.</p>
            <BotoesFase acaoId={acao.id} versao={versao} fase={fase} transicoes={TRANSICOES[fase]} />
            <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs text-zinc-600">
              <dt>Prazo</dt>
              <dd className="text-right tabular-nums">{formatarDia(acao.prazo)}</dd>
              <dt>Reavaliar em</dt>
              <dd className="text-right tabular-nums">{formatarDia(acao.reavaliarEm)}</dd>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 p-4" aria-label="Histórico">
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">Histórico</h2>
            <ol className="flex flex-col gap-3">
              {acao.historico.map((h) => (
                <li key={h.id} className="text-xs">
                  <p className="text-zinc-500">
                    {h.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {h.autor}
                  </p>
                  <p className="text-zinc-800 whitespace-pre-line break-words">{h.descricao}</p>
                </li>
              ))}
            </ol>
          </section>

          <Link href="/gestor/plano" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Voltar ao plano
          </Link>
        </aside>
      </div>
    </ShellGestor>
  );
}
