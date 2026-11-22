import { semCrlf } from "@/lib/plano-acao-util";

/** Responsáveis do relatório — parte pura (vale no navegador e no servidor). */

export const LIMITES_RESPONSAVEL = {
  areaFuncao: 120,
  nome: 120,
  especialidade: 160,
  descritivo: 600,
  empresa: 160,
  email: 160,
  celular: 40,
} as const;

export const MAX_RESPONSAVEIS = 30;

export type CampoResponsavel = keyof typeof LIMITES_RESPONSAVEL;

/** O que sai impresso no relatório e fica gravado na versão emitida. */
export type ResponsavelAssinante = {
  areaFuncao: string;
  nome: string;
  especialidade: string | null;
  descritivo: string | null;
  empresa: string | null;
  email: string | null;
  celular: string | null;
};

/** Linha da tela de edição. */
export type LinhaResponsavel = ResponsavelAssinante & {
  incluirNoRelatorio: boolean;
  /** Posição escolhida; vazio = depois dos numerados, na ordem da tela. */
  ordem: number | null;
};

const ROTULO: Record<CampoResponsavel, string> = {
  areaFuncao: "Área / Função",
  nome: "Nome",
  especialidade: "Especialidade",
  descritivo: "Descritivo",
  empresa: "Empresa",
  email: "E-mail",
  celular: "Celular",
};

const limpa = (v: unknown) => semCrlf(String(v ?? "")).replace(/[ \t]+/g, " ");
// O descritivo pode ter quebras de linha; os demais são de uma linha só.
const umaLinha = (v: unknown) => limpa(v).replace(/\s+/g, " ");

/**
 * Lê o JSON enviado pela tela (lista de linhas) e valida cada uma. Só Nome e
 * Área/Função são obrigatórios. A ordem final é 1..n: primeiro quem tem
 * número (do menor para o maior), depois quem ficou sem número, na ordem da tela.
 */
export function lerResponsaveis(
  bruto: string,
): { ok: true; linhas: (LinhaResponsavel & { ordem: number })[] } | { ok: false; erro: string } {
  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return { ok: false, erro: "Dados inválidos." };
  }
  if (!Array.isArray(dados)) return { ok: false, erro: "Dados inválidos." };
  if (dados.length > MAX_RESPONSAVEIS) return { ok: false, erro: `No máximo ${MAX_RESPONSAVEIS} responsáveis por empresa.` };

  const lidas: { linha: LinhaResponsavel; posicao: number }[] = [];
  for (const [i, item] of dados.entries()) {
    const r = (item ?? {}) as Record<string, unknown>;
    const quem = `Linha ${i + 1}`;
    const campo = (k: CampoResponsavel) => (k === "descritivo" ? limpa(r[k]) : umaLinha(r[k]));
    const nome = campo("nome");
    const areaFuncao = campo("areaFuncao");
    if (nome.length < 2) return { ok: false, erro: `${quem}: informe o nome.` };
    if (areaFuncao.length < 2) return { ok: false, erro: `${quem}: informe a área / função.` };
    for (const k of Object.keys(LIMITES_RESPONSAVEL) as CampoResponsavel[]) {
      if (campo(k).length > LIMITES_RESPONSAVEL[k]) {
        return { ok: false, erro: `${quem}: "${ROTULO[k]}" muito longo (máx. ${LIMITES_RESPONSAVEL[k]} caracteres).` };
      }
    }
    const email = campo("email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: `${quem}: e-mail inválido.` };
    const ordemBruta = r.ordem === "" || r.ordem === null || r.ordem === undefined ? null : Number(r.ordem);
    if (ordemBruta !== null && (!Number.isInteger(ordemBruta) || ordemBruta < 1 || ordemBruta > 999)) {
      return { ok: false, erro: `${quem}: a ordem deve ser um número inteiro de 1 a 999.` };
    }
    const opc = (v: string) => v || null;
    lidas.push({
      posicao: i,
      linha: {
        areaFuncao,
        nome,
        especialidade: opc(campo("especialidade")),
        descritivo: opc(campo("descritivo")),
        empresa: opc(campo("empresa")),
        email: opc(email),
        celular: opc(campo("celular")),
        incluirNoRelatorio: r.incluirNoRelatorio === true,
        ordem: ordemBruta,
      },
    });
  }

  const ordenadas = [...lidas].sort(
    (a, b) =>
      (a.linha.ordem ?? Number.POSITIVE_INFINITY) - (b.linha.ordem ?? Number.POSITIVE_INFINITY) || a.posicao - b.posicao,
  );
  return { ok: true, linhas: ordenadas.map((x, i) => ({ ...x.linha, ordem: i + 1 })) };
}

/** Só quem está marcado, na ordem definida — o que vai para o relatório. */
export function assinantesDe(
  responsaveis: (ResponsavelAssinante & { incluirNoRelatorio: boolean; ordem: number })[],
): ResponsavelAssinante[] {
  return [...responsaveis]
    .filter((r) => r.incluirNoRelatorio)
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ areaFuncao, nome, especialidade, descritivo, empresa, email, celular }) => ({
      areaFuncao,
      nome,
      especialidade,
      descritivo,
      empresa,
      email,
      celular,
    }));
}
