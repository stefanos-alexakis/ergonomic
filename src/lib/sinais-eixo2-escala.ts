/**
 * Escala e textos dos sinais de exposição (ISO 45003, 8.1.2.5). Arquivo sem
 * banco nem planilha, para a tela (componente de cliente) poder importar sem
 * levar o Prisma junto para o navegador.
 */

export const PERGUNTA_SINAIS =
  "Você, como líder de setor, identifica os seguintes sinais de exposição a riscos psicossociais nos colaboradores?";

/** Mesma escala do Eixo 1, com a explicação do cliente para cada opção. */
export const ESCALA_SINAIS = [
  { valor: 1, rotulo: "Não/Nunca", ajuda: "Não / nunca ocorre / não se aplica" },
  { valor: 2, rotulo: "Raramente", ajuda: "Quase nunca" },
  { valor: 3, rotulo: "Às vezes", ajuda: "Ocorre ocasionalmente" },
  { valor: 4, rotulo: "Frequentemente", ajuda: "Ocorre na maior parte das vezes" },
  { valor: 5, rotulo: "Sempre", ajuda: "Ocorre sempre ou quase sempre" },
] as const;

export const VALOR_PADRAO_SINAL = 1;
/** A partir daqui (Frequentemente e Sempre) o resultado fica em destaque. */
export const VALOR_DESTAQUE_SINAL = 4;

export function rotuloSinal(valor: number): string {
  return ESCALA_SINAIS.find((e) => e.valor === valor)?.rotulo ?? "—";
}

export function ehValorSinal(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 5;
}
