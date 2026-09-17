import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { calcularDashboard } from "@/lib/dashboard";
import { carregarPaginasQuestionario, carregarRespostasSalvas } from "@/lib/resposta";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e departamentos" }];

const ROTULO_VALOR: Record<number, string> = {
  1: "Não/Nunca",
  2: "Raramente",
  3: "Às vezes",
  4: "Frequentemente",
  5: "Sempre",
};

export default async function DetalheRespostaPage({
  params,
}: {
  params: Promise<{ id: string; respostaId: string }>;
}) {
  const { id, respostaId } = await params;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  // Nunca confiar num respostaId vindo da URL sem confirmar que ele
  // pertence a esta pesquisa/workspace — mesma regra de isolamento
  // multi-tenant do resto da plataforma (constitution.md §2).
  const resposta = await db.resposta.findFirst({
    where: {
      id: respostaId,
      concluidoEm: { not: null },
      codigoAcesso: { pesquisaId: pesquisa.id, tipo: "PARTICIPANTE" },
    },
    include: { setor: true, departamento: true },
  });
  if (!resposta) notFound();

  // A navegação individual só é permitida quando o grupo dessa resposta
  // (organização toda, sem filtro) tem gente suficiente — mesma regra de
  // supressão do dashboard (constitution.md §3).
  const dashboard = await calcularDashboard(pesquisa.id);
  if (!dashboard.suficiente) notFound();

  const paginas = await carregarPaginasQuestionario(pesquisa.questionarioId);
  const respostasSalvas = await carregarRespostasSalvas(resposta.id);

  const blocosVistos = new Map<
    string,
    { texto: string; perguntaId: string; ordemGlobal: number }[]
  >();
  for (const p of paginas) {
    const lista = blocosVistos.get(p.blocoNome) ?? [];
    for (const q of p.perguntas) {
      lista.push({ texto: q.texto, perguntaId: q.id, ordemGlobal: q.ordemGlobal });
    }
    blocosVistos.set(p.blocoNome, lista);
  }

  return (
    <AppShell contexto={workspace.nome} homeHref="/gestor" nav={NAV} accentColor={workspace.corPrimaria} secondaryColor={workspace.corSecundaria}>
      <PageHeader
        eyebrow={pesquisa.nome}
        title="Resposta individual"
      />

      <p className="text-sm text-zinc-500 mb-6">
        Resposta anônima — {resposta.concluidoEm!.toLocaleDateString("pt-BR")}. Setor:{" "}
        {resposta.setor?.nome ?? "não informado"} · Departamento: {resposta.departamento?.nome ?? "não informado"}
      </p>

      <div className="flex flex-col gap-6 mb-8">
        {Array.from(blocosVistos.entries()).map(([blocoNome, itens]) => (
          <section key={blocoNome} className="rounded-lg border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">{blocoNome}</h3>
            <div className="flex flex-col">
              {itens
                .sort((a, b) => a.ordemGlobal - b.ordemGlobal)
                .map((item, i) => (
                  <div
                    key={item.perguntaId}
                    className={`flex items-start justify-between gap-3 py-3 text-sm ${i > 0 ? "border-t border-zinc-100" : ""}`}
                  >
                    <span className="text-zinc-700">
                      <span className="text-zinc-400">{item.ordemGlobal}.</span> {item.texto}
                    </span>
                    <strong className="text-zinc-900 whitespace-nowrap shrink-0">
                      {(() => {
                        const valor = respostasSalvas.get(item.perguntaId);
                        return valor ? ROTULO_VALOR[valor] : "sem resposta";
                      })()}
                    </strong>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>

      <p>
        <Link
          href={`/gestor/pesquisas/${pesquisa.id}/dashboard/respostas`}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Voltar às respostas
        </Link>
      </p>
    </AppShell>
  );
}
