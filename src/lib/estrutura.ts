import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { parsePlanilhaEstrutura, type ResultadoParsePlanilha } from "@/lib/planilha-estrutura";

// Segmento e Função saem da interface a pedido do cliente (review.md) —
// os models e as colunas em Resposta continuam no banco intactos, só
// ninguém mais escreve ou lê por aqui. Reversível sem perda de dado.
export type TipoCatalogo = "setor" | "departamento";

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
  }
}

export type ResultadoRenomear = { ok: true } | { ok: false; erro: string };

/**
 * `updateMany` com workspaceId no where (não `update` por id sozinho) —
 * um id de outro tenant afeta 0 linhas em vez de vazar/alterar dado de
 * outra empresa (constitution.md §2, mesmo padrão de isolamento do
 * resto da plataforma).
 */
export async function renomearItemCatalogo(
  workspaceId: string,
  tipo: TipoCatalogo,
  id: string,
  novoNome: string,
): Promise<ResultadoRenomear> {
  const nomeLimpo = novoNome.trim();
  if (!nomeLimpo) return { ok: false, erro: "Nome não pode ser vazio." };

  try {
    const resultado =
      tipo === "setor"
        ? await db.setorOrg.updateMany({ where: { id, workspaceId }, data: { nome: nomeLimpo } })
        : await db.departamento.updateMany({ where: { id, workspaceId }, data: { nome: nomeLimpo } });

    if (resultado.count === 0) return { ok: false, erro: "Item não encontrado." };
    return { ok: true };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, erro: "Já existe um item com esse nome." };
    }
    throw err;
  }
}

/**
 * As respostas vinculadas não são apagadas — o campo (setorId/
 * departamentoId) fica nulo (SetNull, padrão do Prisma para relação
 * opcional sem onDelete explícito) e a resposta passa a aparecer como
 * "não informado" no dashboard. Decisão explícita do usuário: apagar em
 * uso é permitido, sem bloqueio.
 */
export async function removerItemCatalogo(
  workspaceId: string,
  tipo: TipoCatalogo,
  id: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const resultado =
    tipo === "setor"
      ? await db.setorOrg.deleteMany({ where: { id, workspaceId } })
      : await db.departamento.deleteMany({ where: { id, workspaceId } });

  if (resultado.count === 0) return { ok: false, erro: "Item não encontrado." };
  return { ok: true };
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
  };

  const pares: [TipoCatalogo, string[]][] = [
    ["setor", parsed.setores],
    ["departamento", parsed.departamentos],
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
  const [setores, departamentos] = await Promise.all([
    db.setorOrg.findMany({
      where: { workspaceId },
      orderBy: { nome: "asc" },
      include: { _count: { select: { respostas: true } } },
    }),
    db.departamento.findMany({
      where: { workspaceId },
      orderBy: { nome: "asc" },
      include: { _count: { select: { respostas: true } } },
    }),
  ]);
  return { setores, departamentos };
}
