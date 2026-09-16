import { randomInt } from "node:crypto";

/**
 * Alfabeto sem caracteres que se confundem em papel impresso: sem 0/O,
 * sem 1/I/L (review.md §2.5). O código é lido de um cartão, não copiado
 * de uma tela — precisa sobreviver à digitação manual.
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TAMANHO_CODIGO = 8;

export function gerarCodigo(): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    codigo += ALFABETO[randomInt(ALFABETO.length)];
  }
  return codigo;
}

/**
 * Normaliza o que o colaborador digitou antes de comparar com o banco:
 * maiúsculas, sem espaços/hífens. Sem isso, "abc-123 45" e "ABC12345"
 * seriam tratados como códigos diferentes (review.md §2.5).
 */
export function normalizarCodigo(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Quantos códigos de teste gerar para N licenças de participante:
 * 5% arredondado para cima (spec.md §5). Ex.: 100 licenças -> 5 testes.
 */
export function calcularQuantidadeTeste(licencas: number): number {
  return Math.ceil(licencas * 0.05);
}

/**
 * Gera `quantidade` códigos únicos, verificando colisão contra um
 * conjunto de códigos já existentes (ex.: já emitidos no banco) e entre
 * si. Retenta até preencher a quantidade pedida — nunca devolve menos
 * silenciosamente (review.md §2.4).
 */
export function gerarLoteCodigosUnicos(
  quantidade: number,
  jaExistentes: ReadonlySet<string>,
  maxTentativas = quantidade * 20 + 100,
): string[] {
  const gerados = new Set<string>();
  let tentativas = 0;
  while (gerados.size < quantidade) {
    if (tentativas++ > maxTentativas) {
      throw new Error(
        `Não foi possível gerar ${quantidade} códigos únicos após ${maxTentativas} tentativas.`,
      );
    }
    const candidato = gerarCodigo();
    if (!jaExistentes.has(candidato) && !gerados.has(candidato)) {
      gerados.add(candidato);
    }
  }
  return Array.from(gerados);
}
