"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { lerConsultor } from "@/lib/consultores-util";

export type EstadoConsultor = { erro?: string; sucesso?: string } | undefined;

/**
 * Consultores valem para todas as empresas — só o admin da plataforma
 * mexe. A checagem fica aqui (Server Actions podem ser chamadas de
 * qualquer rota), não só no middleware.
 */
async function admin() {
  const actor = await getActor();
  return actor?.isPlatformAdmin ? actor : null;
}

export async function criarConsultorAction(_e: EstadoConsultor, fd: FormData): Promise<EstadoConsultor> {
  if (!(await admin())) return { erro: "Sem permissão." };
  const lido = lerConsultor(fd);
  if (!lido.ok) return { erro: lido.erro };
  await db.consultor.create({ data: lido.dados });
  revalidatePath("/admin/consultores");
  return { sucesso: `Consultor ${lido.dados.nome} cadastrado.` };
}

export async function salvarConsultorAction(id: string, _e: EstadoConsultor, fd: FormData): Promise<EstadoConsultor> {
  if (!(await admin())) return { erro: "Sem permissão." };
  const lido = lerConsultor(fd);
  if (!lido.ok) return { erro: lido.erro };
  const r = await db.consultor.updateMany({ where: { id }, data: lido.dados });
  if (r.count === 0) return { erro: "Consultor não encontrado." };
  revalidatePath("/admin/consultores");
  return { sucesso: "Salvo." };
}

/** Relatórios já emitidos guardam uma cópia dos dados — excluir não os altera. */
export async function excluirConsultorAction(id: string): Promise<void> {
  if (!(await admin())) return;
  await db.consultor.deleteMany({ where: { id } });
  // Tira o consultor dos rascunhos de relatório que o tinham escolhido.
  const rascunhos = await db.relatorioRascunho.findMany({ where: { consultorIds: { has: id } }, select: { workspaceId: true, consultorIds: true } });
  for (const r of rascunhos) {
    await db.relatorioRascunho.update({
      where: { workspaceId: r.workspaceId },
      data: { consultorIds: r.consultorIds.filter((x) => x !== id) },
    });
  }
  revalidatePath("/admin/consultores");
}
