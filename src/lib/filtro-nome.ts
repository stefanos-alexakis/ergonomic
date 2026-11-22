/** Minúsculas e sem acento, para comparar nomes sem se importar com isso. */
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filtra por um trecho do nome (ignora maiúsculas, acentos e espaços a mais).
 * Termo vazio devolve a lista inteira.
 */
export function filtrarPorNome<T extends { nome: string }>(itens: T[], termo: string | null | undefined): T[] {
  const busca = normalizarParaBusca(termo ?? "");
  if (!busca) return itens;
  return itens.filter((i) => normalizarParaBusca(i.nome).includes(busca));
}
