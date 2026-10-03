import Link from "next/link";
import { calcularProgresso, carregarFormulario } from "@/lib/avaliacao-eixo2";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { contextoAvaliacao } from "../contexto";
import { reabrirAvaliacaoAction } from "../actions";
import { QuestaoCard } from "./questao-card";

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

  const [{ dimensoes, respostas }, progresso] = await Promise.all([
    carregarFormulario(avaliacao.id, avaliacao.questionarioId),
    calcularProgresso(avaliacao.id, avaliacao.questionarioId),
  ]);

  const etapa = Math.min(Math.max(Number.parseInt(etapaParam ?? "1", 10) || 1, 1), dimensoes.length);
  const dimensao = dimensoes[etapa - 1]!;
  const concluida = avaliacao.status === "CONCLUIDA";
  const percentual = progresso.total === 0 ? 0 : Math.round((progresso.completas / progresso.total) * 100);

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
          <span className="text-xs text-zinc-400">{percentual}%</span>
        </div>
        <div className="h-1 w-full bg-[var(--ws-secondary,#f4f4f5)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--ws-accent,#18181b)] rounded-full" style={{ width: `${percentual}%` }} />
        </div>
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
      </nav>

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

      <div className="flex items-center justify-between mt-8">
        {etapa > 1 ? (
          <Link href={`/gestor/eixo2/${avaliacao.id}?etapa=${etapa - 1}`}>
            <Button variant="secondary">← Anterior</Button>
          </Link>
        ) : (
          <span />
        )}
        {etapa < dimensoes.length ? (
          <Link href={`/gestor/eixo2/${avaliacao.id}?etapa=${etapa + 1}`}>
            <Button>Próxima dimensão →</Button>
          </Link>
        ) : (
          !concluida && (
            <Link href={`/gestor/eixo2/${avaliacao.id}/concluir`}>
              <Button>Revisar e concluir →</Button>
            </Link>
          )
        )}
      </div>
    </ShellGestor>
  );
}
