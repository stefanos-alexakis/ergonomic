import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { calcularProgresso } from "@/lib/avaliacao-eixo2";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoAvaliacao } from "../../contexto";
import { FechamentoForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ConcluirAvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, workspace, avaliacao } = await contextoAvaliacao(id);
  if (avaliacao.status === "CONCLUIDA") redirect(`/gestor/eixo2/${avaliacao.id}/resultado`);

  const [progresso, praticas] = await Promise.all([
    calcularProgresso(avaliacao.id, avaliacao.questionarioId),
    db.praticaAdicional.findMany({ where: { avaliacaoId: avaliacao.id }, orderBy: { ordem: "asc" } }),
  ]);
  const faltam = progresso.total - progresso.completas;

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <div className="max-w-3xl">
        <PageHeader eyebrow={avaliacao.nome} title="Revisar e concluir" />

        {faltam > 0 ? (
          <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Ainda faltam {faltam} pergunta(s) sem resposta em algum setor.{" "}
            <Link href={`/gestor/eixo2/${avaliacao.id}`} className="underline">
              Voltar ao preenchimento
            </Link>
            . Você pode salvar os dados abaixo agora e concluir depois.
          </p>
        ) : (
          <p className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Todas as {progresso.total} perguntas estão respondidas em todos os setores.
          </p>
        )}

        <FechamentoForm
          avaliacaoId={avaliacao.id}
          podeConcluir={faltam === 0}
          inicial={{
            participantes: avaliacao.participantes ?? "",
            responsavel: avaliacao.responsavel ?? "",
            observacaoFinal: avaliacao.observacaoFinal ?? "",
            praticas: praticas.map((p) => ({
              descricao: p.descricao,
              frequencia: p.frequencia ?? "",
              evidencia: p.evidencia ?? "",
            })),
          }}
        />
      </div>
    </ShellGestor>
  );
}
