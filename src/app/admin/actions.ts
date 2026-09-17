"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { iniciarImpersonacao, encerrarImpersonacao } from "@/lib/impersonacao";

export async function assumirVisaoGestorAction(workspaceId: string): Promise<void> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return;

  const resultado = await iniciarImpersonacao(actor.userId, workspaceId);
  if (!resultado.ok) return; // empresa inativa/inexistente — nada a fazer, sem redirect

  redirect("/gestor");
}

export async function encerrarImpersonacaoAction(): Promise<void> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return;

  await encerrarImpersonacao(actor.userId);
  redirect("/admin");
}
