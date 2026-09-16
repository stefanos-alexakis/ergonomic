import { db } from "@/lib/db";
import { parsePlanilhaEstrutura, type ResultadoParsePlanilha } from "@/lib/planilha-estrutura";

export type TipoCatalogo = "setor" | "departamento" | "segmento" | "funcao";

export async function adicionarItemCatalogo(
  workspaceId: string,
  tipo: TipoCatalogo,
  nome: string,
) {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) throw new Error("Nome não pode ser vazio.");
  const where = { workspaceId_nome: { workspaceId, nome: nomeLimpo } };
  const data = { workspaceId, nome: nomeLimpo };

  switch (tipo) {
    case "setor":
      return db.setorOrg.upsert({ where, update: {}, create: data });
    case "departamento":
      return db.departamento.upsert({ where, update: {}, create: data });
    case "segmento":
      return db.segmento.upsert({ where, update: {}, create: data });
    case "funcao":
      return db.funcao.upsert({ where, update: {}, create: data });
  }
}

export type RelatorioImportacao = {
  criados: Record<TipoCatalogo, number>;
  erros: ResultadoParsePlanilha["erros"];
};

/**
 * Importa a planilha e cadastra tudo que for válido — uma célula com
 * problema não derruba as demais (tasks.md Fase 3: "nunca falha
 * silenciosamente", mas também nunca tudo-ou-nada por um erro isolado).
 */
export async function importarPlanilhaEstrutura(
  workspaceId: string,
  arquivo: Buffer,
): Promise<RelatorioImportacao> {
  const parsed = await parsePlanilhaEstrutura(arquivo);

  const criados: Record<TipoCatalogo, number> = {
    setor: 0,
    departamento: 0,
    segmento: 0,
    funcao: 0,
  };

  const pares: [TipoCatalogo, string[]][] = [
    ["setor", parsed.setores],
    ["departamento", parsed.departamentos],
    ["segmento", parsed.segmentos],
    ["funcao", parsed.funcoes],
  ];

  for (const [tipo, valores] of pares) {
    for (const valor of valores) {
      await adicionarItemCatalogo(workspaceId, tipo, valor);
      criados[tipo]++;
    }
  }

  return { criados, erros: parsed.erros };
}

export async function listarCatalogoOrganizacional(workspaceId: string) {
  const [setores, departamentos, segmentos, funcoes] = await Promise.all([
    db.setorOrg.findMany({ where: { workspaceId }, orderBy: { nome: "asc" } }),
    db.departamento.findMany({ where: { workspaceId }, orderBy: { nome: "asc" } }),
    db.segmento.findMany({ where: { workspaceId }, orderBy: { nome: "asc" } }),
    db.funcao.findMany({ where: { workspaceId }, orderBy: { nome: "asc" } }),
  ]);
  return { setores, departamentos, segmentos, funcoes };
}
