/**
 * Regra de supressão de grupos pequenos (constituição §3, review.md §1.1).
 *
 * Esconder um único grupo não protege nada se o total for visível: quem
 * vê o total e a soma dos grupos visíveis descobre o valor escondido por
 * subtração — e se aquele grupo tiver poucas pessoas, acabou de
 * identificar as respostas delas. Por isso, quando exatamente um grupo
 * for suprimido pelo limite mínimo, o segundo menor também é suprimido:
 * com duas incógnitas e uma soma conhecida, a subtração não fecha.
 */

export type GrupoAgregado<T> = T & { total: number };
export type GrupoComSupressao<T> = GrupoAgregado<T> & { suprimido: boolean };

export function aplicarSupressaoGruposPequenos<T>(
  grupos: ReadonlyArray<GrupoAgregado<T>>,
  limiteMinimo: number,
): GrupoComSupressao<T>[] {
  const resultado: GrupoComSupressao<T>[] = grupos.map((g) => ({
    ...g,
    suprimido: g.total < limiteMinimo,
  }));

  const suprimidos = resultado.filter((g) => g.suprimido);

  if (suprimidos.length === 1) {
    const visiveis = resultado.filter((g) => !g.suprimido);
    if (visiveis.length > 0) {
      const menorVisivel = visiveis.reduce((menor, atual) =>
        atual.total < menor.total ? atual : menor,
      );
      menorVisivel.suprimido = true;
    }
  }

  return resultado;
}
