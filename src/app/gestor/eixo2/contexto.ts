import { notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { resolverAvaliacao } from "@/lib/avaliacao-eixo2";

/** Sessão + empresa do gestor; 404 sem isso (nunca vaza existência). */
export async function contextoGestor() {
  const actor = await getActor();
  if (!actor) notFound();
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) notFound();
  return { actor, workspace };
}

/** Avaliação desta empresa, ou 404 — id de outra empresa nunca é aceito. */
export async function contextoAvaliacao(id: string) {
  const ctx = await contextoGestor();
  const avaliacao = await resolverAvaliacao(id, ctx.workspace.id);
  if (!avaliacao) notFound();
  return { ...ctx, avaliacao, setores: avaliacao.setores.map((s) => ({ id: s.setor.id, nome: s.setor.nome })) };
}
