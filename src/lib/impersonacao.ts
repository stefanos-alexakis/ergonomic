import { db } from "@/lib/db";

/**
 * "Assumir a visão de gestor": em vez de inventar um mecanismo novo de
 * bypass de tenant, o admin ganha uma Membership real e temporária
 * (`impersonada: true`) na empresa-alvo — o mesmo mecanismo de acesso
 * que já é a fonte da verdade em toda a `/gestor/**` (getWorkspaceDoGestor,
 * src/lib/pesquisa.ts). Nenhuma dessas 11 páginas/actions precisa mudar:
 * elas resolvem o workspace do admin exatamente como resolveriam o de
 * qualquer gestor de verdade (constitution.md §2 — sempre por Membership
 * verificada, nunca por um workspaceId solto).
 */

export type ResultadoImpersonacao = { ok: true } | { ok: false; erro: string };

export async function iniciarImpersonacao(
  adminUserId: string,
  workspaceId: string,
): Promise<ResultadoImpersonacao> {
  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, isActive: true, deletedAt: null },
  });
  if (!workspace) return { ok: false, erro: "Empresa não encontrada ou inativa." };

  // Limpa qualquer impersonação anterior deste admin antes de criar a
  // nova — sem isso, trocar de empresa sem clicar em "Sair" deixaria o
  // admin acumulando Membership em várias empresas ao mesmo tempo, e
  // getWorkspaceDoGestor (que pega a primeira por id) poderia resolver a
  // empresa errada.
  await db.$transaction([
    db.membership.deleteMany({ where: { userId: adminUserId, impersonada: true } }),
    db.membership.create({
      data: { userId: adminUserId, workspaceId, role: "GESTOR", impersonada: true },
    }),
  ]);
  return { ok: true };
}

export async function encerrarImpersonacao(adminUserId: string): Promise<void> {
  await db.membership.deleteMany({ where: { userId: adminUserId, impersonada: true } });
}
