/**
 * Regra de vigência da pesquisa (spec.md §6, review.md §3.1): quem
 * ainda não começou é bloqueado exatamente no encerramento; quem já
 * tinha começado ganha uma tolerância para terminar sem perder o que
 * respondeu.
 */

const TOLERANCIA_PADRAO_MINUTOS = 60;

export function pesquisaAceitaAcesso(
  pesquisa: { dataInicio: Date; dataFim: Date; arquivadaEm?: Date | null },
  opts: { jaIniciado: boolean; agora?: Date; toleranciaMinutos?: number },
): boolean {
  const agora = opts.agora ?? new Date();
  const tolerancia = opts.toleranciaMinutos ?? TOLERANCIA_PADRAO_MINUTOS;

  // Arquivada não recebe mais respostas (nem de quem já tinha começado).
  if (pesquisa.arquivadaEm) return false;

  if (agora.getTime() < pesquisa.dataInicio.getTime()) return false;

  const limite = opts.jaIniciado
    ? new Date(pesquisa.dataFim.getTime() + tolerancia * 60_000)
    : pesquisa.dataFim;

  return agora.getTime() <= limite.getTime();
}

export type StatusPesquisa = "RASCUNHO" | "AGENDADA" | "ABERTA" | "ENCERRADA";

export const ROTULO_STATUS_PESQUISA: Record<StatusPesquisa, string> = {
  RASCUNHO: "Rascunho",
  AGENDADA: "Agendada",
  ABERTA: "Aberta",
  ENCERRADA: "Encerrada",
};

/**
 * Status exibido da pesquisa, calculado na hora pelas datas — a coluna
 * `Pesquisa.status` só recebia RASCUNHO na criação e nada a atualizava
 * (não há tarefa agendada), então a tela mostrava "RASCUNHO" para sempre.
 * Calcular na leitura nunca fica desatualizado e segue a mesma referência
 * de datas de `pesquisaAceitaAcesso`:
 *   - passou do encerramento → ENCERRADA (com ou sem códigos);
 *   - sem códigos gerados    → RASCUNHO (ninguém consegue responder ainda);
 *   - antes do início        → AGENDADA;
 *   - entre início e fim     → ABERTA.
 */
export function statusDaPesquisa(
  pesquisa: { dataInicio: Date; dataFim: Date },
  opts: { codigosGerados: boolean; agora?: Date },
): StatusPesquisa {
  const agora = (opts.agora ?? new Date()).getTime();
  if (agora > pesquisa.dataFim.getTime()) return "ENCERRADA";
  if (!opts.codigosGerados) return "RASCUNHO";
  if (agora < pesquisa.dataInicio.getTime()) return "AGENDADA";
  return "ABERTA";
}

// ── Classificação da lista (Abertas · Concluídas · Arquivadas) ───────────

export type ClasseListaPesquisa = "ABERTAS" | "CONCLUIDAS" | "ARQUIVADAS";

export const ROTULO_CLASSE_PESQUISA: Record<ClasseListaPesquisa, string> = {
  ABERTAS: "Abertas",
  CONCLUIDAS: "Concluídas",
  ARQUIVADAS: "Arquivadas",
};

/**
 * Em qual aba da lista a pesquisa fica. Arquivada é uma ação do gestor;
 * Concluída é automática, pelo encerramento (prorrogar a data a traz de volta
 * para Abertas); o resto — rascunho, agendada e aberta — é "em operação".
 */
export function classificarPesquisa(
  pesquisa: { dataFim: Date; arquivadaEm?: Date | null },
  agora: Date = new Date(),
): ClasseListaPesquisa {
  if (pesquisa.arquivadaEm) return "ARQUIVADAS";
  return agora.getTime() > pesquisa.dataFim.getTime() ? "CONCLUIDAS" : "ABERTAS";
}

// ── Exclusão de pesquisa iniciada: 30 dias de carência ───────────────────

export const DIAS_CARENCIA_EXCLUSAO = 30;

/** Data a partir da qual a exclusão definitiva é permitida. */
export function exclusaoLiberadaEm(solicitadaEm: Date): Date {
  return new Date(solicitadaEm.getTime() + DIAS_CARENCIA_EXCLUSAO * 24 * 60 * 60 * 1000);
}

export function exclusaoDefinitivaLiberada(solicitadaEm: Date | null | undefined, agora: Date = new Date()): boolean {
  return !!solicitadaEm && agora.getTime() >= exclusaoLiberadaEm(solicitadaEm).getTime();
}

// ── Prorrogação do encerramento ──────────────────────────────────────────

export type ResultadoEncerramento = { ok: true } | { ok: false; erro: string };

/**
 * Valida a nova data de encerramento. Depois que a coleta começou, só dá para
 * prorrogar (nunca encurtar), para não fechar à força quem já respondeu.
 */
export function validarNovoEncerramento(
  pesquisa: { dataInicio: Date; dataFim: Date },
  novoFim: Date,
  opts: { iniciada: boolean },
): ResultadoEncerramento {
  if (Number.isNaN(novoFim.getTime())) return { ok: false, erro: "Data de encerramento inválida." };
  if (novoFim.getTime() <= pesquisa.dataInicio.getTime()) {
    return { ok: false, erro: "O encerramento precisa ser depois do início da pesquisa." };
  }
  if (opts.iniciada && novoFim.getTime() < pesquisa.dataFim.getTime()) {
    return {
      ok: false,
      erro: "A pesquisa já recebeu respostas: o encerramento só pode ser prorrogado, não antecipado.",
    };
  }
  return { ok: true };
}
