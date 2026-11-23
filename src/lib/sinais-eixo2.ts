import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { resolverAvaliacao, type Resultado } from "@/lib/avaliacao-eixo2";
import {
  PERGUNTA_SINAIS,
  VALOR_DESTAQUE_SINAL,
  VALOR_PADRAO_SINAL,
  ehValorSinal,
  rotuloSinal,
} from "@/lib/sinais-eixo2-escala";

export * from "@/lib/sinais-eixo2-escala";

/**
 * Sinais de exposição a riscos psicossociais (ISO 45003, item 8.1.2.5) que o
 * líder de cada setor identifica nos colaboradores — preenchidos pelo
 * consultor na mesma entrevista do Eixo 2.
 *
 * O padrão é "Nunca" (1) em todo sinal e setor, sem ninguém precisar marcar;
 * só o que foi identificado vira linha no banco (valor 2 a 5). É um indicador
 * à parte: não entra no fator do Eixo 2 nem no índice final (decisão do
 * cliente), só fica disponível para análise.
 */

export type SinalCatalogo = { id: string; ordem: number; texto: string };

export async function listarSinais(): Promise<SinalCatalogo[]> {
  return db.sinalEixo2.findMany({ orderBy: { ordem: "asc" } });
}

/** Valores identificados por "sinalId:setorId" (o que não está aqui é "Nunca"). */
export async function carregarValoresSinais(avaliacaoId: string): Promise<Record<string, number>> {
  const linhas = await db.respostaSinalEixo2.findMany({ where: { avaliacaoId } });
  return Object.fromEntries(linhas.map((l) => [`${l.sinalId}:${l.setorId}`, l.valor]));
}

/**
 * Grava a resposta de UM setor a UM sinal. Valor 1 ("Nunca") volta ao
 * padrão, apagando a linha. O setor e o sinal precisam ser desta avaliação.
 */
export async function salvarSinal(
  avaliacaoId: string,
  workspaceId: string,
  input: { sinalId: string; setorId: string; valor: number },
): Promise<Resultado> {
  const avaliacao = await resolverAvaliacao(avaliacaoId, workspaceId);
  if (!avaliacao) return { ok: false, erro: "Avaliação não encontrada." };
  if (avaliacao.status === "CONCLUIDA") return { ok: false, erro: "Avaliação concluída — reabra para editar." };
  if (!ehValorSinal(input.valor)) return { ok: false, erro: "Resposta inválida." };
  if (!avaliacao.setores.some((s) => s.setorId === input.setorId)) {
    return { ok: false, erro: "Setor fora desta avaliação." };
  }
  const sinal = await db.sinalEixo2.findUnique({ where: { id: input.sinalId }, select: { id: true } });
  if (!sinal) return { ok: false, erro: "Sinal inválido." };

  const chave = { avaliacaoId, sinalId: sinal.id, setorId: input.setorId };
  if (input.valor === VALOR_PADRAO_SINAL) {
    await db.respostaSinalEixo2.deleteMany({ where: chave });
  } else {
    await db.respostaSinalEixo2.upsert({
      where: { avaliacaoId_sinalId_setorId: chave },
      update: { valor: input.valor },
      create: { ...chave, valor: input.valor },
    });
  }
  return { ok: true };
}

/** O consultor confirma que revisou os sinais (inclusive "nenhum sinal em nenhum setor"). */
export async function confirmarRevisaoSinais(avaliacaoId: string, workspaceId: string): Promise<Resultado> {
  const avaliacao = await resolverAvaliacao(avaliacaoId, workspaceId);
  if (!avaliacao) return { ok: false, erro: "Avaliação não encontrada." };
  if (avaliacao.status === "CONCLUIDA") return { ok: false, erro: "Avaliação concluída — reabra para editar." };
  if (!avaliacao.sinaisRevisadosEm) {
    await db.avaliacaoEixo2.update({ where: { id: avaliacao.id }, data: { sinaisRevisadosEm: new Date() } });
  }
  return { ok: true };
}

export type ResultadoSinais = {
  /** Falso em avaliações que nunca passaram pela etapa: o "Nunca" ali é só o padrão. */
  revisado: boolean;
  sinais: SinalCatalogo[];
  setores: { id: string; nome: string }[];
  /** Valor (1 a 5) por "sinalId:setorId". */
  valores: Record<string, number>;
  /** Quantos sinais cada setor tem identificados (valor 2 a 5). */
  identificadosPorSetor: Record<string, number>;
};

export async function calcularResultadoSinais(
  avaliacaoId: string,
  setores: { id: string; nome: string }[],
): Promise<ResultadoSinais> {
  const [avaliacao, sinais, identificados] = await Promise.all([
    db.avaliacaoEixo2.findUniqueOrThrow({ where: { id: avaliacaoId }, select: { sinaisRevisadosEm: true } }),
    listarSinais(),
    carregarValoresSinais(avaliacaoId),
  ]);
  const valores: Record<string, number> = {};
  const identificadosPorSetor: Record<string, number> = {};
  for (const s of setores) {
    identificadosPorSetor[s.id] = 0;
    for (const sinal of sinais) {
      const v = identificados[`${sinal.id}:${s.id}`] ?? VALOR_PADRAO_SINAL;
      valores[`${sinal.id}:${s.id}`] = v;
      if (v > VALOR_PADRAO_SINAL) identificadosPorSetor[s.id] = (identificadosPorSetor[s.id] ?? 0) + 1;
    }
  }
  return { revisado: avaliacao.sinaisRevisadosEm !== null, sinais, setores, valores, identificadosPorSetor };
}

/** Planilha dos sinais: uma linha por sinal, uma coluna por setor. */
export async function gerarSinaisExcel(
  avaliacaoId: string,
  setores: { id: string; nome: string }[],
  titulo: string,
): Promise<Buffer> {
  const r = await calcularResultadoSinais(avaliacaoId, setores);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sinais de exposição");
  ws.addRow([titulo]).font = { bold: true, size: 13 };
  ws.addRow([PERGUNTA_SINAIS]);
  if (!r.revisado) ws.addRow(["Etapa ainda não revisada: \"Nunca\" é apenas o valor padrão."]);
  ws.addRow([]);
  const cab = ws.addRow(["Sinal", ...r.setores.map((s) => s.nome)]);
  cab.font = { bold: true };
  ws.getColumn(1).width = 70;
  r.setores.forEach((_, i) => (ws.getColumn(i + 2).width = 18));
  for (const sinal of r.sinais) {
    const linha = ws.addRow([sinal.texto, ...r.setores.map((s) => rotuloSinal(r.valores[`${sinal.id}:${s.id}`] ?? 1))]);
    linha.getCell(1).alignment = { wrapText: true, vertical: "top" };
    r.setores.forEach((s, i) => {
      if ((r.valores[`${sinal.id}:${s.id}`] ?? 1) >= VALOR_DESTAQUE_SINAL) {
        linha.getCell(i + 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
      }
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
