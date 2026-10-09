import { db } from "@/lib/db";
import { calcularMedia } from "@/lib/dashboard";
import { PERGUNTAS_PRE_PESQUISA, distribuir, type ChavePrePesquisa, type DistribuicaoPergunta } from "@/lib/pre-pesquisa";

/**
 * Resultados da pré-pesquisa. Duas leituras, com acessos diferentes
 * (decisão do cliente, out/2026):
 *   - `perfilParticipantes` → gestor e relatórios: totais da pesquisa
 *     inteira, SEPARADOS do Eixo 1 (sem setor, sem cruzamento);
 *   - `cruzamentoPrePesquisa` → só o admin da plataforma: perfil × setor e
 *     perfil × índice do Eixo 1.
 * As duas só contam respostas concluídas de códigos de participante e
 * respeitam o mínimo de respostas da pesquisa.
 */

const CHAVES = PERGUNTAS_PRE_PESQUISA.map((p) => p.chave);
const SELECAO_RESPOSTAS = Object.fromEntries(CHAVES.map((c) => [c, true])) as Record<ChavePrePesquisa, true>;

const ondeConcluida = (pesquisaId: string) => ({
  pesquisaId,
  resposta: { concluidoEm: { not: null }, codigoAcesso: { tipo: "PARTICIPANTE" as const } },
});

export type PerfilParticipantes = {
  limite: number;
  /** Concluíram a pesquisa (com ou sem pré-pesquisa). */
  concluidas: number;
  /** Responderam ao menos uma pergunta da pré-pesquisa. */
  responderam: number;
  suficiente: boolean;
  distribuicao: DistribuicaoPergunta[];
};

export async function perfilParticipantes(pesquisaId: string): Promise<PerfilParticipantes | null> {
  const pesquisa = await db.pesquisa.findUnique({
    where: { id: pesquisaId },
    select: { exibirPrePesquisa: true, limiteSupressaoGrupo: true },
  });
  if (!pesquisa) return null;
  const [linhas, concluidas] = await Promise.all([
    db.respostaPrePesquisa.findMany({ where: ondeConcluida(pesquisaId), select: SELECAO_RESPOSTAS }),
    db.resposta.count({ where: { concluidoEm: { not: null }, codigoAcesso: { pesquisaId, tipo: "PARTICIPANTE" } } }),
  ]);
  // Pesquisa sem pré-pesquisa (nem agora, nem antes): nada a mostrar.
  if (!pesquisa.exibirPrePesquisa && linhas.length === 0) return null;
  const suficiente = linhas.length >= pesquisa.limiteSupressaoGrupo;
  return {
    limite: pesquisa.limiteSupressaoGrupo,
    concluidas,
    responderam: linhas.length,
    suficiente,
    distribuicao: suficiente ? distribuir(linhas) : [],
  };
}

export type CelulaCruzamento = { n: number; visivel: boolean };

export type LinhaCruzamento = {
  valor: string | null;
  rotulo: string;
  total: number;
  /** Índice do Eixo 1 (média das médias individuais) — só com n ≥ limite. */
  indiceEixo1: number | null;
  porSetor: CelulaCruzamento[];
};

export type CruzamentoPrePesquisa = {
  limite: number;
  total: number;
  setores: { id: string; nome: string }[];
  perguntas: { chave: ChavePrePesquisa; rotulo: string; linhas: LinhaCruzamento[] }[];
};

/** Cruzamento — SÓ para a área do admin (quem chama confere `isPlatformAdmin`). */
export async function cruzamentoPrePesquisa(pesquisaId: string): Promise<CruzamentoPrePesquisa | null> {
  const pesquisa = await db.pesquisa.findUnique({ where: { id: pesquisaId }, select: { limiteSupressaoGrupo: true } });
  if (!pesquisa) return null;
  const limite = pesquisa.limiteSupressaoGrupo;

  const linhas = await db.respostaPrePesquisa.findMany({
    where: ondeConcluida(pesquisaId),
    select: {
      ...SELECAO_RESPOSTAS,
      resposta: {
        select: {
          setor: { select: { id: true, nome: true } },
          itens: { select: { valor: true, pergunta: { select: { peso: true, polaridade: true } } } },
        },
      },
    },
  });

  const pessoas = linhas.map((l) => ({
    respostas: l,
    setor: l.resposta.setor,
    media: calcularMedia(l.resposta.itens.map((i) => ({ valor: i.valor, polaridade: i.pergunta.polaridade, peso: i.pergunta.peso }))),
  }));
  const setores = [...new Map(pessoas.filter((p) => p.setor).map((p) => [p.setor!.id, p.setor!])).values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const perguntas = PERGUNTAS_PRE_PESQUISA.map((pergunta) => {
    const opcoes: { valor: string | null; rotulo: string }[] = [...pergunta.opcoes, { valor: null, rotulo: "Não respondeu" }];
    return {
      chave: pergunta.chave,
      rotulo: pergunta.rotuloCurto,
      linhas: opcoes.map(({ valor, rotulo }) => {
        const grupo = pessoas.filter((p) => (p.respostas[pergunta.chave] ?? null) === valor);
        const medias = grupo.map((p) => p.media).filter((m): m is number => m !== null);
        return {
          valor,
          rotulo,
          total: grupo.length,
          indiceEixo1: medias.length >= limite ? medias.reduce((a, b) => a + b, 0) / medias.length : null,
          porSetor: setores.map((s) => {
            const n = grupo.filter((p) => p.setor?.id === s.id).length;
            return { n, visivel: n === 0 || n >= limite };
          }),
        };
      }),
    };
  });

  return { limite, total: pessoas.length, setores, perguntas };
}
