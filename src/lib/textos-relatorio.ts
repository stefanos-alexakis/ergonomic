import { db } from "@/lib/db";

/**
 * Textos fixos do relatório completo mantidos pelo admin. Hoje só o dossiê
 * da legislação (em elaboração pela consultoria) — enquanto vazio, o
 * relatório mostra o aviso de "em elaboração".
 */
export const TEXTOS_RELATORIO = {
  LEGISLACAO: {
    titulo: "Dossiê da legislação",
    vazio: "Seção em elaboração pela consultoria — o dossiê da legislação será incluído em uma próxima versão deste relatório.",
  },
} as const;

export type ChaveTexto = keyof typeof TEXTOS_RELATORIO;
export const LIMITE_TEXTO_RELATORIO = 60_000;

export async function lerTexto(chave: ChaveTexto): Promise<string | null> {
  const t = await db.textoRelatorio.findUnique({ where: { chave } });
  return t?.conteudo.trim() ? t.conteudo : null;
}
