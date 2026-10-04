/**
 * Regra de vigência da pesquisa (spec.md §6, review.md §3.1): quem
 * ainda não começou é bloqueado exatamente no encerramento; quem já
 * tinha começado ganha uma tolerância para terminar sem perder o que
 * respondeu.
 */

const TOLERANCIA_PADRAO_MINUTOS = 60;

export function pesquisaAceitaAcesso(
  pesquisa: { dataInicio: Date; dataFim: Date },
  opts: { jaIniciado: boolean; agora?: Date; toleranciaMinutos?: number },
): boolean {
  const agora = opts.agora ?? new Date();
  const tolerancia = opts.toleranciaMinutos ?? TOLERANCIA_PADRAO_MINUTOS;

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
