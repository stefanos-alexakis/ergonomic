import { z } from "zod";

/**
 * Cor da marca: só hexadecimal, aplicada depois via variável CSS —
 * nunca concatenada direto num estilo (review.md §4.3). Sem isso, o
 * campo "cor primária" seria texto livre e um valor mal-intencionado
 * poderia quebrar a página pública do colaborador.
 */
export const corHexSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Cor precisa estar no formato hexadecimal, ex.: #0F6E6E");

export const workspaceInputSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(120),
  corPrimaria: corHexSchema.nullable().optional(),
  corSecundaria: corHexSchema.nullable().optional(),
});

/**
 * Gera um slug estável a partir do nome da empresa (usado na URL da
 * pesquisa). Remove acentos e qualquer caractere que não seja
 * letra/número/hífen.
 */
export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Luminância relativa (WCAG) de uma cor hex — usada para recusar
 * combinações de marca que ficariam ilegíveis (constituição §5:
 * personalização visual não pode reduzir acessibilidade).
 */
export function luminanciaRelativa(hex: string): number {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrasteEntre(hexA: string, hexB: string): number {
  const la = luminanciaRelativa(hexA);
  const lb = luminanciaRelativa(hexB);
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

/** WCAG AA para texto normal: contraste mínimo de 4.5:1. */
export function contrasteSuficiente(corTexto: string, corFundo: string): boolean {
  return contrasteEntre(corTexto, corFundo) >= 4.5;
}
