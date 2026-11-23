import type { PaginaQuestionario } from "@/lib/paginacao-questionario";

/**
 * Pergunta aberta final do Eixo 1 (opcional): o que a empresa poderia fazer
 * para melhorar as condições de trabalho no setor.
 */
export const PERGUNTA_SUGESTAO = "Na sua opinião, o que a empresa poderia fazer para melhorar as condições de trabalho no seu setor?";
export const LIMITE_SUGESTAO = 2000;

export type SugestaoLida = { ok: true; texto: string | null } | { ok: false; erro: string };

/**
 * Normaliza o texto vindo do formulário: quebras de linha unificadas, espaços
 * nas pontas removidos, vazio vira "sem resposta" (a pergunta é opcional) e
 * texto acima do limite é recusado em vez de cortado em silêncio.
 */
export function normalizarSugestao(bruto: unknown): SugestaoLida {
  const texto = (typeof bruto === "string" ? bruto : "").replace(/\r\n?/g, "\n").trim();
  if (texto.length === 0) return { ok: true, texto: null };
  if (texto.length > LIMITE_SUGESTAO) {
    return { ok: false, erro: `O texto passou de ${LIMITE_SUGESTAO} caracteres. Resuma um pouco para continuar.` };
  }
  return { ok: true, texto };
}

/**
 * Primeira página do questionário com alguma pergunta sem resposta, ou null
 * se tudo foi respondido. Protege a conclusão de quem abre direto o link da
 * página final (`?pagina=N+1`) sem ter respondido as perguntas de escala.
 */
export function primeiraPaginaPendente(
  paginas: PaginaQuestionario[],
  respondidas: ReadonlyMap<string, number>,
): number | null {
  const pendente = paginas.find((p) => p.perguntas.some((q) => !respondidas.has(q.id)));
  return pendente ? pendente.numeroPagina : null;
}
