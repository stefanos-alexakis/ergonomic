import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Workspace } from "@prisma/client";

/**
 * Guard único de isolamento multi-tenant (constituição §2). Toda rota que
 * lida com dados de um workspace específico deve resolver o acesso por
 * aqui — nunca aceitar `workspaceId` vindo do cliente sem essa checagem.
 */

export type Actor = {
  userId: string;
  isPlatformAdmin: boolean;
};

/**
 * Resolve o actor (Admin/Gestor) a partir da sessão NextAuth atual.
 * Retorna `null` quando não há sessão — o chamador decide se isso é
 * redirecionamento para login ou 401, conforme o contexto da rota.
 */
export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { userId: session.user.id, isPlatformAdmin: session.user.isPlatformAdmin };
}

/**
 * Retorna o Workspace se o actor tiver acesso (é PLATFORM_ADMIN ou tem
 * Membership ativa), ou `null` se não tiver — o chamador deve tratar
 * `null` como "não encontrado" (404), nunca como "sem permissão" (403),
 * para não revelar a um usuário não vinculado que aquele workspace existe.
 */
export async function resolveWorkspace(
  actor: Actor,
  workspaceSlugOrId: string,
): Promise<Workspace | null> {
  const workspace = await db.workspace.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      OR: [{ id: workspaceSlugOrId }, { slug: workspaceSlugOrId }],
    },
  });
  if (!workspace) return null;

  if (actor.isPlatformAdmin) return workspace;

  const membership = await db.membership.findFirst({
    where: { userId: actor.userId, workspaceId: workspace.id },
  });
  return membership ? workspace : null;
}

/**
 * Filtro base para toda query de negócio dentro de um workspace resolvido.
 * Existe para que "esqueci o workspaceId" seja impossível de escrever sem
 * chamar essa função — não porque a linha em si seja complexa.
 */
export function scoped(workspaceId: string) {
  return { workspaceId };
}
