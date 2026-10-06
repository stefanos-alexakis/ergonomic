import { db } from "@/lib/db";
import { compararPorNumeroDaDimensao } from "@/lib/dashboard";

/** Fatores (dimensões) do questionário ativo, de 1 a 13. */
export async function fatoresAtivos() {
  const dims = await db.dimensao.findMany({
    where: { bloco: { questionario: { ativo: true } } },
    select: { id: true, nome: true },
  });
  return dims.sort(compararPorNumeroDaDimensao);
}

export async function setoresDaEmpresa(workspaceId: string) {
  return db.setorOrg.findMany({ where: { workspaceId }, select: { id: true, nome: true }, orderBy: { nome: "asc" } });
}
