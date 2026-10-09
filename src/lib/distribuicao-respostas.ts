import { db } from "@/lib/db";
import { aplicarSupressaoGruposPequenos } from "@/lib/agregacao";
import { calcularMedia, compararPorNumeroDaDimensao, normalizarValor, type Polaridade } from "@/lib/dashboard";
import { MEDIA_EXPOSTO } from "@/lib/fmea";

/**
 * Distribuição das respostas do Eixo 1 (pedido do cliente, out/2026):
 * quantas pessoas marcaram cada opção de cada pergunta, por setor.
 *
 * Destaque pela NOSSA metodologia (decisão do cliente): a pergunta fica em
 * destaque quando 50% ou mais dos respondentes estão "expostos" —
 * Frequentemente ou Sempre, a mesma definição de exposto da FMEA.
 *
 * Anonimato: só respostas concluídas de códigos de participante; setor
 * abaixo do mínimo da pesquisa (e o segundo menor, contra a subtração)
 * não aparece.
 */

export const OPCOES_ESCALA = [
  { valor: 1, rotulo: "Não/Nunca" },
  { valor: 2, rotulo: "Raramente" },
  { valor: 3, rotulo: "Às vezes" },
  { valor: 4, rotulo: "Frequentemente" },
  { valor: 5, rotulo: "Sempre" },
] as const;

/** Parcela mínima de expostos para destacar a pergunta (50%). */
export const PARCELA_DESTAQUE = 0.5;

export type PerguntaCatalogo = {
  id: string;
  numero: number;
  texto: string;
  polaridade: Polaridade;
  peso: number;
  fatorId: string;
  fatorNome: string;
};

export type LinhaDistribuicao = {
  pergunta: PerguntaCatalogo;
  /** Índice = valor da opção (1–5) → quantidade. */
  contagem: Record<1 | 2 | 3 | 4 | 5, number>;
  n: number;
  expostos: number;
  parcelaExpostos: number | null;
  destaque: boolean;
};

export type FatorDistribuicao = {
  id: string;
  nome: string;
  indice: number | null;
  linhas: LinhaDistribuicao[];
};

/** Exposto = resposta que, na escala de risco (1 melhor, 5 pior), dá 4 ou 5. */
export function estaExposto(valor: number, polaridade: Polaridade): boolean {
  return normalizarValor(valor, polaridade) >= MEDIA_EXPOSTO;
}

/** Destaque em 50% ou mais — comparado em inteiros (5 de 10 é destaque, sem arredondamento). */
export function temDestaque(expostos: number, n: number): boolean {
  return n > 0 && expostos * 2 >= n;
}

/** Função pura: conta as respostas de um conjunto de pessoas, agrupando por fator (1–13). */
export function distribuir(
  perguntas: PerguntaCatalogo[],
  respostas: { itens: { perguntaId: string; valor: number }[] }[],
): FatorDistribuicao[] {
  const linhas = new Map<string, LinhaDistribuicao>(
    perguntas.map((p) => [
      p.id,
      { pergunta: p, contagem: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, n: 0, expostos: 0, parcelaExpostos: null, destaque: false },
    ]),
  );
  const itensPorFator = new Map<string, { valor: number; polaridade: Polaridade; peso: number }[]>();
  for (const r of respostas) {
    for (const i of r.itens) {
      const l = linhas.get(i.perguntaId);
      if (!l || !(i.valor >= 1 && i.valor <= 5)) continue;
      l.contagem[i.valor as 1 | 2 | 3 | 4 | 5]++;
      l.n++;
      if (estaExposto(i.valor, l.pergunta.polaridade)) l.expostos++;
      const lista = itensPorFator.get(l.pergunta.fatorId) ?? [];
      lista.push({ valor: i.valor, polaridade: l.pergunta.polaridade, peso: l.pergunta.peso });
      itensPorFator.set(l.pergunta.fatorId, lista);
    }
  }
  for (const l of linhas.values()) {
    l.parcelaExpostos = l.n ? l.expostos / l.n : null;
    l.destaque = temDestaque(l.expostos, l.n);
  }

  const fatores = new Map<string, FatorDistribuicao>();
  for (const p of [...perguntas].sort((a, b) => a.numero - b.numero)) {
    const f = fatores.get(p.fatorId) ?? { id: p.fatorId, nome: p.fatorNome, indice: null, linhas: [] };
    f.linhas.push(linhas.get(p.id)!);
    fatores.set(p.fatorId, f);
  }
  for (const f of fatores.values()) f.indice = calcularMedia(itensPorFator.get(f.id) ?? []);
  return [...fatores.values()].sort(compararPorNumeroDaDimensao);
}

export type SetorDistribuicao = { id: string; nome: string; total: number; suprimido: boolean };

export type DistribuicaoPesquisa = {
  limite: number;
  /** Respostas concluídas consideradas (todos os setores). */
  total: number;
  suficiente: boolean;
  setores: SetorDistribuicao[];
  /** Setor efetivamente filtrado (null = todos). Setor suprimido nunca é aceito. */
  setorSelecionado: SetorDistribuicao | null;
  respondentes: number;
  fatores: FatorDistribuicao[];
};

/** Catálogo de perguntas do questionário da pesquisa, com o fator (dimensão). */
async function carregarPerguntas(questionarioId: string): Promise<PerguntaCatalogo[]> {
  const perguntas = await db.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId } } } },
    select: {
      id: true,
      ordemGlobal: true,
      texto: true,
      polaridade: true,
      peso: true,
      fatorRisco: { select: { dimensao: { select: { id: true, nome: true } } } },
    },
  });
  return perguntas.map((p) => ({
    id: p.id,
    numero: p.ordemGlobal,
    texto: p.texto,
    polaridade: p.polaridade,
    peso: p.peso,
    fatorId: p.fatorRisco.dimensao.id,
    fatorNome: p.fatorRisco.dimensao.nome,
  }));
}

/**
 * Distribuição da pesquisa toda ou de um setor. Quem chama já confirmou
 * que a pesquisa é da empresa do gestor.
 */
export async function calcularDistribuicao(pesquisaId: string, setorId?: string | null): Promise<DistribuicaoPesquisa> {
  const pesquisa = await db.pesquisa.findUniqueOrThrow({
    where: { id: pesquisaId },
    select: { questionarioId: true, limiteSupressaoGrupo: true },
  });
  const limite = pesquisa.limiteSupressaoGrupo;
  const [perguntas, respostas] = await Promise.all([
    carregarPerguntas(pesquisa.questionarioId),
    db.resposta.findMany({
      where: { concluidoEm: { not: null }, codigoAcesso: { pesquisaId, tipo: "PARTICIPANTE" } },
      select: { setor: { select: { id: true, nome: true } }, itens: { select: { perguntaId: true, valor: true } } },
    }),
  ]);

  const contagemSetor = new Map<string, { id: string; nome: string; total: number }>();
  for (const r of respostas) {
    if (!r.setor) continue;
    const s = contagemSetor.get(r.setor.id) ?? { ...r.setor, total: 0 };
    s.total++;
    contagemSetor.set(r.setor.id, s);
  }
  const setores = aplicarSupressaoGruposPequenos([...contagemSetor.values()], limite).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const suficiente = respostas.length >= limite;
  const setorSelecionado = setores.find((s) => s.id === setorId && !s.suprimido) ?? null;
  const consideradas = setorSelecionado ? respostas.filter((r) => r.setor?.id === setorSelecionado.id) : respostas;

  return {
    limite,
    total: respostas.length,
    suficiente,
    setores,
    setorSelecionado,
    respondentes: suficiente ? consideradas.length : 0,
    fatores: suficiente ? distribuir(perguntas, consideradas) : [],
  };
}
