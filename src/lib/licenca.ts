import { db } from "@/lib/db";
import { calcularQuantidadeTeste, gerarLoteCodigosUnicos } from "@/lib/codigo";
import type { CodigoTipo } from "@prisma/client";

/**
 * Insere `quantidade` códigos únicos para a pesquisa, conferindo quantos
 * realmente entraram (`skipDuplicates` descarta colisões em silêncio) e
 * completando o que faltou até bater a quantidade pedida — nunca menos,
 * sem avisar (review.md §2.4).
 */
async function inserirCodigosUnicos(
  pesquisaId: string,
  tipo: CodigoTipo,
  quantidade: number,
): Promise<number> {
  let inseridos = 0;
  let rodadas = 0;
  const MAX_RODADAS = 20;

  while (inseridos < quantidade && rodadas++ < MAX_RODADAS) {
    const faltam = quantidade - inseridos;
    const candidatos = gerarLoteCodigosUnicos(faltam, new Set());
    const resultado = await db.codigoAcesso.createMany({
      data: candidatos.map((codigo) => ({ pesquisaId, codigo, tipo })),
      skipDuplicates: true,
    });
    inseridos += resultado.count;
  }

  if (inseridos < quantidade) {
    throw new Error(
      `Só foi possível gerar ${inseridos} de ${quantidade} códigos únicos para o tipo ${tipo}.`,
    );
  }
  return inseridos;
}

export type ResultadoGerarLicencas =
  | { ok: true; participantes: number; teste: number }
  | { ok: false; erro: string };

export async function gerarLicencas(pesquisaId: string): Promise<ResultadoGerarLicencas> {
  const pesquisa = await db.pesquisa.findUnique({ where: { id: pesquisaId } });
  if (!pesquisa) return { ok: false, erro: "Pesquisa não encontrada." };

  const jaExistem = await db.codigoAcesso.count({ where: { pesquisaId } });
  if (jaExistem > 0) {
    return { ok: false, erro: "Códigos já foram gerados para esta pesquisa." };
  }

  const quantidadeTeste = calcularQuantidadeTeste(pesquisa.licencasSolicitadas);
  const participantes = await inserirCodigosUnicos(
    pesquisaId,
    "PARTICIPANTE",
    pesquisa.licencasSolicitadas,
  );
  const teste = await inserirCodigosUnicos(pesquisaId, "TESTE", quantidadeTeste);

  return { ok: true, participantes, teste };
}

export async function listarCodigos(pesquisaId: string) {
  return db.codigoAcesso.findMany({
    where: { pesquisaId },
    orderBy: [{ tipo: "asc" }, { createdAt: "asc" }],
  });
}
