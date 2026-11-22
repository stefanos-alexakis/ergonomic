import { db } from "@/lib/db";
import {
  assinantesDe,
  type LinhaResponsavel,
  type ResponsavelAssinante,
} from "@/lib/responsaveis-relatorio-util";

export * from "@/lib/responsaveis-relatorio-util";

/** Cadastro de responsáveis do relatório de uma empresa (sem login; só constam e assinam). */

export async function listarResponsaveis(workspaceId: string): Promise<(LinhaResponsavel & { id: string })[]> {
  const lista = await db.responsavelRelatorio.findMany({
    where: { workspaceId },
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
  });
  return lista.map((r) => ({
    id: r.id,
    areaFuncao: r.areaFuncao,
    nome: r.nome,
    especialidade: r.especialidade,
    descritivo: r.descritivo,
    empresa: r.empresa,
    email: r.email,
    celular: r.celular,
    incluirNoRelatorio: r.incluirNoRelatorio,
    ordem: r.ordem,
  }));
}

/**
 * Substitui a lista inteira da empresa de uma vez (a tela salva tudo junto).
 * Nada mais aponta para estas linhas — os relatórios emitidos guardam uma cópia.
 */
export async function salvarResponsaveis(workspaceId: string, linhas: (LinhaResponsavel & { ordem: number })[]) {
  await db.$transaction([
    db.responsavelRelatorio.deleteMany({ where: { workspaceId } }),
    db.responsavelRelatorio.createMany({
      data: linhas.map((l) => ({
        workspaceId,
        areaFuncao: l.areaFuncao,
        nome: l.nome,
        especialidade: l.especialidade,
        descritivo: l.descritivo,
        empresa: l.empresa,
        email: l.email,
        celular: l.celular,
        incluirNoRelatorio: l.incluirNoRelatorio,
        ordem: l.ordem,
      })),
    }),
  ]);
}

/** Retrato dos responsáveis marcados, na ordem — usado no PDF e gravado na versão emitida. */
export async function responsaveisParaRelatorio(workspaceId: string): Promise<ResponsavelAssinante[]> {
  const lista = await db.responsavelRelatorio.findMany({ where: { workspaceId, incluirNoRelatorio: true } });
  return assinantesDe(lista);
}
