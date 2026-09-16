/**
 * Divide as perguntas em páginas sequenciais sem misturar Bloco 1 e
 * Bloco 2 na mesma página (spec.md §6). O tamanho de página é o mesmo
 * para todos os blocos; o último grupo de cada bloco fica menor quando
 * a quantidade não é múltipla exata.
 */

export type PerguntaResumo = { id: string; texto: string; ordemGlobal: number };
export type BlocoComPerguntas = { blocoId: string; blocoNome: string; perguntas: PerguntaResumo[] };
export type PaginaQuestionario = {
  blocoId: string;
  blocoNome: string;
  perguntas: PerguntaResumo[];
  numeroPagina: number; // 1-indexado, global (cobre todos os blocos em sequência)
};

const TAMANHO_PAGINA_PADRAO = 7;

export function montarPaginas(
  blocos: BlocoComPerguntas[],
  tamanhoPagina = TAMANHO_PAGINA_PADRAO,
): PaginaQuestionario[] {
  const paginas: PaginaQuestionario[] = [];

  for (const bloco of blocos) {
    for (let i = 0; i < bloco.perguntas.length; i += tamanhoPagina) {
      paginas.push({
        blocoId: bloco.blocoId,
        blocoNome: bloco.blocoNome,
        perguntas: bloco.perguntas.slice(i, i + tamanhoPagina),
        numeroPagina: 0, // preenchido abaixo
      });
    }
  }

  return paginas.map((p, i) => ({ ...p, numeroPagina: i + 1 }));
}
