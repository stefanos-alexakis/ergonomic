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
