import Link from "next/link";
import { calcularProgresso, carregarFormulario } from "@/lib/avaliacao-eixo2";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { contextoAvaliacao } from "../contexto";
import { reabrirAvaliacaoAction } from "../actions";
import { QuestaoCard } from "./questao-card";
import { SinaisEtapa } from "./sinais-etapa";
import { carregarValoresSinais, listarSinais } from "@/lib/sinais-eixo2";
import { BotaoConcluir } from "./botao-concluir";

export const dynamic = "force-dynamic";

export default async function PreenchimentoEixo2Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ etapa?: string }>;
}) {
  const { id } = await params;
  const { etapa: etapaParam } = await searchParams;
  const { actor, workspace, avaliacao, setores } = await contextoAvaliacao(id);

  const [{ dimensoes, respostas }, progresso, sinais, valoresSinais] = await Promise.all([
    carregarFormulario(avaliacao.id, avaliacao.questionarioId),
    calcularProgresso(avaliacao.id, avaliacao.questionarioId),
    listarSinais(),
    carregarValoresSinais(avaliacao.id),
  ]);

  // As 13 dimensões + uma etapa final: os sinais de exposição (ISO 45003).
  const temSinais = sinais.length > 0;
  const totalEtapas = dimensoes.length + (temSinais ? 1 : 0);
  const etapa = Math.min(Math.max(Number.parseInt(etapaParam ?? "1", 10) || 1, 1), totalEtapas);
  const naEtapaSinais = temSinais && etapa === totalEtapas;
  const dimensao = naEtapaSinais ? null : dimensoes[etapa - 1]!;
  const sinaisRevisados = avaliacao.sinaisRevisadosEm !== null;
  const concluida = avaliacao.status === "CONCLUIDA";
  const percentual = progresso.total === 0 ? 0 : Math.round((progresso.completas / progresso.total) * 100);
  // Tudo respondido (ex.: avaliação reaberta para corrigir uma resposta):
  // dá para concluir de qualquer etapa, sem percorrer as 13 até o fim.
  const podeConcluir =
    !concluida && progresso.total > 0 && progresso.completas === progresso.total && (!temSinais || sinaisRevisados);

  const completa = (dimId: string) =>
    dimensoes
      .find((d) => d.id === dimId)!
      .questoes.every((q) => setores.every((s) => respostas[`${q.id}:${s.id}`]));

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader
        eyebrow="Eixo 2 · Medidas de controle"
        title={avaliacao.nome}
        actions={
          <>
            <Link href={`/gestor/eixo2/${avaliacao.id}/resultado`}>
              <Button variant="secondary">Ver resultado</Button>
            </Link>
            {!concluida && (
              <Link href={`/gestor/eixo2/${avaliacao.id}/setores`}>
                <Button variant="ghost">Setores ({setores.length})</Button>
              </Link>
            )}
            {podeConcluir && <BotaoConcluir avaliacaoId={avaliacao.id} />}
          </>
        }
      />

      {concluida && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span>Avaliação concluída — respostas somente para leitura.</span>
          <form action={reabrirAvaliacaoAction.bind(null, avaliacao.id)}>
            <button type="submit" className="underline hover:no-underline cursor-pointer">
              Reabrir para editar
            </button>
          </form>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2 text-sm">
          <span className="text-zinc-600">
            {progresso.completas} de {progresso.total} perguntas respondidas em todos os setores
          </span>
          <span className="text-xs text-zinc-400">
            {!concluida && "Salvo automaticamente · "}
            {percentual}%
          </span>
        </div>
        <div className="h-1 w-full bg-[var(--ws-secondary,#f4f4f5)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--ws-accent,#18181b)] rounded-full" style={{ width: `${percentual}%` }} />
        </div>
        {!concluida && temSinais && !sinaisRevisados && (
          <p className="mt-2 text-xs text-amber-800">
            Falta confirmar a revisão dos sinais de exposição.{" "}
            <Link href={`/gestor/eixo2/${avaliacao.id}?etapa=${totalEtapas}`} className="underline">
              Ir para a etapa ISO 45003
            </Link>
          </p>
        )}
      </div>

      <nav aria-label="Dimensões" className="flex flex-wrap gap-1.5 mb-6">
        {dimensoes.map((d, i) => {
          const atual = i + 1 === etapa;
          const ok = completa(d.id);
          return (
            <Link
              key={d.id}
              href={`/gestor/eixo2/${avaliacao.id}?etapa=${i + 1}`}
              aria-current={atual ? "step" : undefined}
              title={d.nome}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                atual
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {ok && !atual ? "✓ " : ""}
              {d.nome.split(" ")[0]?.replace(".", "")}
            </Link>
          );
        })}
        {temSinais && (
          <Link
            href={`/gestor/eixo2/${avaliacao.id}?etapa=${totalEtapas}`}
            aria-current={naEtapaSinais ? "step" : undefined}
            title="Sinais de exposição (ISO 45003)"
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              naEtapaSinais
                ? "border-zinc-900 bg-zinc-900 text-white"
                : sinaisRevisados
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {sinaisRevisados && !naEtapaSinais ? "✓ " : ""}ISO 45003
          </Link>
        )}
      </nav>

      {naEtapaSinais ? (
        <SinaisEtapa
          avaliacaoId={avaliacao.id}
          sinais={sinais}
          setores={setores}
          iniciais={valoresSinais}
          revisadoInicial={sinaisRevisados}
          somenteLeitura={concluida}
        />
      ) : (
        dimensao && (
        <section>
          <h2 className="text-lg font-bold text-zinc-900">{dimensao.nome}</h2>
          <p className="text-sm text-zinc-500 mb-5">Fator de risco PGR: {dimensao.fator}</p>

          <div className="flex flex-col gap-4">
            {dimensao.questoes.map((q) => (
              <QuestaoCard
                key={q.id}
                avaliacaoId={avaliacao.id}
                questao={q}
                setores={setores}
                iniciais={Object.fromEntries(setores.map((s) => [s.id, respostas[`${q.id}:${s.id}`]]))}
                somenteLeitura={concluida}
              />
            ))}
          </div>
        </section>
        )
      )}

      <div className="flex items-center justify-between mt-8">
        {etapa > 1 ? (
          <Link href={`/gestor/eixo2/${avaliacao.id}?etapa=${etapa - 1}`}>
            <Button variant="secondary">← Anterior</Button>
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-start gap-2">
          {podeConcluir && etapa < totalEtapas && <BotaoConcluir avaliacaoId={avaliacao.id} />}
          {etapa < totalEtapas ? (
            <Link href={`/gestor/eixo2/${avaliacao.id}?etapa=${etapa + 1}`}>
              <Button variant={podeConcluir ? "secondary" : "primary"}>{etapa + 1 === totalEtapas && temSinais ? "Próxima etapa: sinais (ISO 45003) →" : "Próxima dimensão →"}</Button>
            </Link>
          ) : (
            !concluida && (
              <Link href={`/gestor/eixo2/${avaliacao.id}/concluir`}>
                <Button>Revisar e concluir →</Button>
              </Link>
            )
          )}
        </div>
      </div>
    </ShellGestor>
  );
}
