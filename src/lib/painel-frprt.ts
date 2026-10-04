import { db } from "@/lib/db";
import { calcularMedia } from "@/lib/dashboard";
import { calcularResultado } from "@/lib/avaliacao-eixo2";
import { calcularEixo3Setor } from "@/lib/eixo3";
import { carregarMatriz } from "@/lib/levantamento-eixo3";
import { calcularRiscoFinal, concluir, notaDoRisco, type Conclusao } from "@/lib/score-final";

/**
 * Painel FRPRT — cruza, por setor × fator de risco:
 *   Eixo 1 (pesquisa: média 1–5 dos colaboradores do setor)
 *   × Eixo 2 (avaliação: fator de controle 0,80–1,00)
 *   × Eixo 3 (levantamento: ×1,10 se houver CID-F relacionado e compatível)
 *
 * Anonimato (constitution.md §3): setor com menos respostas concluídas que
 * o limite da pesquisa não tem o Eixo 1 exibido nem o score calculado.
 * Só cruza conjuntos da mesma versão do questionário (o Eixo 2 e a matriz
 * CID estão ligados às perguntas da versão ativa).
 */

export type SelecaoPainel = { pesquisaId?: string; avaliacaoId?: string; levantamentoId?: string };
export type FiltrosPainel = { setorId?: string; departamentoId?: string };

export type CelulaPainel = {
  fatorId: string;
  eixo1: number | null;
  fatorEixo2: number;
  semEixo2: boolean;
  fatorEixo3: number;
  cidsEixo3: string[];
  rotuloEixo3: "Relação com o trabalho" | "CID-F sem relação" | "Sem CID-F" | "Sem levantamento";
  ajustado: number | null;
  final: number | null;
  conclusao: Conclusao | null;
};

export type LinhaSetorPainel = {
  setorId: string;
  nome: string;
  colaboradores: number | null;
  respondentes: number;
  participacao: number | null;
  suprimido: boolean;
  eixo1: number | null;
  fatorEixo2: number | null;
  efeitoEixo2: number | null;
  efeitoEixo3: number | null;
  final: number | null;
  nota: number | null;
  conclusao: Conclusao | null;
  fatoresEmRisco: number;
  temOcorrenciaRelacionada: boolean;
  celulas: CelulaPainel[];
};

/** Opções dos seletores do topo + seleção efetiva (padrão: mais recente de cada). */
export async function opcoesPainel(workspaceId: string, selecao: SelecaoPainel) {
  const questionario = await db.questionario.findFirst({ where: { ativo: true } });
  if (!questionario) return null;

  const [pesquisas, avaliacoes, levantamentos] = await Promise.all([
    db.pesquisa.findMany({
      where: { workspaceId, questionarioId: questionario.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, nome: true, dataInicio: true, dataFim: true, limiteSupressaoGrupo: true },
    }),
    db.avaliacaoEixo2.findMany({
      where: { workspaceId, questionarioId: questionario.id },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }], // CONCLUIDA antes de RASCUNHO
      select: { id: true, nome: true, status: true, concluidaEm: true },
    }),
    db.levantamentoEixo3.findMany({
      where: { workspaceId, status: "PUBLICADO" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nome: true,
        periodoInicio: true,
        periodoFim: true,
        responsavel: true,
        cargoResponsavel: true,
        declaracaoAceitaEm: true,
      },
    }),
  ]);

  // Só aceita ids que estão nas listas desta empresa — id de fora vira "padrão".
  const escolher = <T extends { id: string }>(lista: T[], id?: string) =>
    (id === "nenhum" ? undefined : (lista.find((x) => x.id === id) ?? lista[0])) ?? null;

  return {
    questionarioId: questionario.id,
    pesquisas,
    avaliacoes,
    levantamentos,
    pesquisa: escolher(pesquisas, selecao.pesquisaId),
    avaliacao: escolher(avaliacoes, selecao.avaliacaoId),
    levantamento: escolher(levantamentos, selecao.levantamentoId),
  };
}

export async function calcularPainelFrprt(workspaceId: string, selecao: SelecaoPainel, filtros: FiltrosPainel) {
  const opcoes = await opcoesPainel(workspaceId, selecao);
  if (!opcoes) return null;
  const { questionarioId, pesquisa, avaliacao, levantamento } = opcoes;
  const { fatores, matriz, situacoes } = await carregarMatriz(questionarioId);
  const limite = pesquisa?.limiteSupressaoGrupo ?? 5;

  // ── Eixo 1 por setor × fator ────────────────────────────────────────
  const respostas = pesquisa
    ? await db.resposta.findMany({
        where: {
          concluidoEm: { not: null },
          setorId: filtros.setorId ? filtros.setorId : { not: null },
          codigoAcesso: { pesquisaId: pesquisa.id, tipo: "PARTICIPANTE" },
          ...(filtros.departamentoId ? { departamentoId: filtros.departamentoId } : {}),
        },
        select: {
          setorId: true,
          itens: {
            select: {
              valor: true,
              pergunta: { select: { peso: true, polaridade: true, fatorRisco: { select: { dimensaoId: true } } } },
            },
          },
        },
      })
    : [];
  // Participação usa o total do setor, sem o filtro de departamento.
  const respondentesPorSetor = pesquisa
    ? await db.resposta.groupBy({
        by: ["setorId"],
        where: { concluidoEm: { not: null }, codigoAcesso: { pesquisaId: pesquisa.id, tipo: "PARTICIPANTE" } },
        _count: { _all: true },
      })
    : [];

  const eixo1PorSetor = new Map<string, { n: number; porFator: Map<string, number | null> }>();
  const agrupadas = new Map<string, typeof respostas>();
  for (const r of respostas) agrupadas.set(r.setorId!, [...(agrupadas.get(r.setorId!) ?? []), r]);
  for (const [setorId, lista] of agrupadas) {
    const porFator = new Map<string, number | null>();
    for (const f of fatores) {
      const itens = lista.flatMap((r) =>
        r.itens
          .filter((i) => i.pergunta.fatorRisco.dimensaoId === f.id)
          .map((i) => ({ valor: i.valor, polaridade: i.pergunta.polaridade, peso: i.pergunta.peso })),
      );
      porFator.set(f.id, calcularMedia(itens));
    }
    eixo1PorSetor.set(setorId, { n: lista.length, porFator });
  }

  // ── Eixo 2 ───────────────────────────────────────────────────────────
  const setoresAvaliacao = avaliacao
    ? await db.avaliacaoEixo2Setor.findMany({
        where: { avaliacaoId: avaliacao.id },
        select: { setor: { select: { id: true, nome: true } } },
      })
    : [];
  const eixo2 = avaliacao
    ? await calcularResultado(avaliacao.id, questionarioId, setoresAvaliacao.map((s) => s.setor))
    : null;
  const eixo2PorSetor = new Map(eixo2?.linhas.map((l) => [l.setor.id, l]) ?? []);

  // ── Eixo 3 ───────────────────────────────────────────────────────────
  const ocorrencias = levantamento
    ? await db.ocorrenciaEixo3.findMany({
        where: { levantamentoId: levantamento.id, ignorada: false, setorId: { not: null } },
        select: { setorId: true, cid: true, relacao: true, diasAfastados: true },
      })
    : [];
  const ocorrenciasPorSetor = new Map<string, typeof ocorrencias>();
  for (const o of ocorrencias) ocorrenciasPorSetor.set(o.setorId!, [...(ocorrenciasPorSetor.get(o.setorId!) ?? []), o]);

  // ── Setores: quem aparece em qualquer um dos três eixos ───────────────
  const ids = new Set<string>([...eixo1PorSetor.keys(), ...eixo2PorSetor.keys(), ...ocorrenciasPorSetor.keys()]);
  for (const r of respondentesPorSetor) if (r.setorId) ids.add(r.setorId);
  if (filtros.setorId) for (const id of [...ids]) if (id !== filtros.setorId) ids.delete(id);
  const setores = await db.setorOrg.findMany({
    where: { workspaceId, id: { in: [...ids] } },
    select: { id: true, nome: true, numeroColaboradores: true },
    orderBy: { nome: "asc" },
  });

  const linhas: LinhaSetorPainel[] = setores.map((setor) => {
    const e1 = eixo1PorSetor.get(setor.id);
    const respondentes = respondentesPorSetor.find((r) => r.setorId === setor.id)?._count._all ?? 0;
    const suprimido = !e1 || e1.n < limite;
    const e2 = eixo2PorSetor.get(setor.id);
    const e3 = levantamento ? calcularEixo3Setor(ocorrenciasPorSetor.get(setor.id) ?? [], matriz) : null;
    const temOcorrencias = (ocorrenciasPorSetor.get(setor.id)?.length ?? 0) > 0;

    const celulas: CelulaPainel[] = fatores.map((f) => {
      const eixo1 = suprimido ? null : (e1?.porFator.get(f.id) ?? null);
      const f2 = e2?.porDimensao[f.id] ?? null;
      const fatorEixo2 = f2 ?? 1;
      const fatorEixo3 = e3?.fatorPorFator.get(f.id) ?? 1;
      const cidsEixo3 = e3?.cidsPorFator.get(f.id) ?? [];
      const ajustado = eixo1 !== null ? eixo1 * fatorEixo2 : null;
      const final = eixo1 !== null ? calcularRiscoFinal(eixo1, fatorEixo2, fatorEixo3) : null;
      return {
        fatorId: f.id,
        eixo1,
        fatorEixo2,
        semEixo2: f2 === null,
        fatorEixo3,
        cidsEixo3,
        rotuloEixo3: !levantamento
          ? "Sem levantamento"
          : fatorEixo3 > 1
            ? "Relação com o trabalho"
            : temOcorrencias
              ? "CID-F sem relação"
              : "Sem CID-F",
        ajustado,
        final,
        conclusao: final !== null ? concluir(final) : null,
      };
    });

    const comValor = celulas.filter((c) => c.eixo1 !== null && c.final !== null && c.ajustado !== null);
    const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const eixo1Setor = media(comValor.map((c) => c.eixo1!));
    const finalSetor = media(comValor.map((c) => c.final!));

    return {
      setorId: setor.id,
      nome: setor.nome,
      colaboradores: setor.numeroColaboradores,
      respondentes,
      participacao:
        setor.numeroColaboradores && setor.numeroColaboradores > 0 ? respondentes / setor.numeroColaboradores : null,
      suprimido,
      eixo1: eixo1Setor,
      fatorEixo2: e2?.geral ?? null,
      efeitoEixo2: media(comValor.map((c) => c.ajustado! - c.eixo1!)),
      efeitoEixo3: media(comValor.map((c) => c.final! - c.ajustado!)),
      final: finalSetor,
      nota: finalSetor !== null ? notaDoRisco(finalSetor) : null,
      conclusao: finalSetor !== null ? concluir(finalSetor) : null,
      fatoresEmRisco: celulas.filter((c) => c.conclusao === "RISCO_EXISTENTE").length,
      temOcorrenciaRelacionada: (e3?.relacionadas ?? 0) > 0,
      celulas,
    };
  });

  // ── Principais fatores: % de setores com o fator acima de 3,00 ────────
  const setoresComScore = linhas.filter((l) => l.final !== null);
  const principais = fatores
    .map((f) => {
      const finais = setoresComScore
        .map((l) => l.celulas.find((x) => x.fatorId === f.id))
        .filter((c): c is CelulaPainel => c?.final != null);
      const acima = finais.filter((c) => c.conclusao !== "SEM_RISCO").length;
      const mediaFinal = finais.length ? finais.reduce((a, c) => a + c.final!, 0) / finais.length : 0;
      return { fator: f, percentual: setoresComScore.length ? acima / setoresComScore.length : 0, setores: acima, mediaFinal };
    })
    .filter((p) => p.setores > 0)
    // Empate no % de setores (comum com poucos setores): o mais grave primeiro.
    .sort((a, b) => b.percentual - a.percentual || b.mediaFinal - a.mediaFinal)
    .slice(0, 6);

  // ── Textos de apoio por fator (matriz CID e planos de ação) ───────────
  const apoioPorFator = new Map<string, { consequencias: string[]; observacoes: string[]; cids: string[] }>();
  for (const s of situacoes) {
    const id = s.perguntaEixo1.fatorRisco.dimensao.id;
    const atual = apoioPorFator.get(id) ?? { consequencias: [], observacoes: [], cids: [] };
    if (!atual.consequencias.includes(s.consequencias)) atual.consequencias.push(s.consequencias);
    if (!atual.observacoes.includes(s.observacaoTecnica)) atual.observacoes.push(s.observacaoTecnica);
    for (const c of s.cids) if (!atual.cids.includes(c)) atual.cids.push(c);
    apoioPorFator.set(id, atual);
  }

  const questoesEixo2 = await db.questaoEixo2.findMany({
    where: { perguntaEixo1: { fatorRisco: { dimensao: { bloco: { questionarioId } } } } },
    select: { id: true, planoSugerido: true, perguntaEixo1: { select: { fatorRisco: { select: { dimensaoId: true } } } } },
  });
  const sugeridosPorFator = new Map<string, string[]>();
  for (const q of questoesEixo2) {
    const id = q.perguntaEixo1.fatorRisco.dimensaoId;
    const lista = sugeridosPorFator.get(id) ?? [];
    for (const linha of (q.planoSugerido ?? "").split("\n")) {
      const t = linha.replace(/^-\s*/, "").trim();
      if (t && !lista.includes(t)) lista.push(t);
    }
    sugeridosPorFator.set(id, lista);
  }

  const planosRegistrados = avaliacao
    ? await db.respostaEixo2.findMany({
        where: { avaliacaoId: avaliacao.id, planoAcao: { not: null } },
        select: { setorId: true, planoAcao: true, questao: { select: { perguntaEixo1: { select: { fatorRisco: { select: { dimensaoId: true } } } } } } },
      })
    : [];

  const pgr = linhas.flatMap((l) =>
    l.celulas
      .filter((c) => c.conclusao === "RISCO_EXISTENTE")
      .map((c) => {
        const fator = fatores.find((f) => f.id === c.fatorId)!;
        const registrados = planosRegistrados
          .filter((p) => p.setorId === l.setorId && p.questao.perguntaEixo1.fatorRisco.dimensaoId === c.fatorId)
          .map((p) => p.planoAcao!);
        return {
          setor: l.nome,
          fator,
          celula: c,
          apoio: apoioPorFator.get(c.fatorId) ?? { consequencias: [], observacoes: [], cids: [] },
          planos: [...new Set(registrados)],
          planosSugeridos: sugeridosPorFator.get(c.fatorId) ?? [],
        };
      }),
  );

  return {
    opcoes,
    fatores,
    limite,
    linhas,
    principais: principais.map((p) => ({ ...p, tratativas: (sugeridosPorFator.get(p.fator.id) ?? []).slice(0, 3) })),
    pgr,
    avaliacaoIncompleta: Boolean(eixo2?.linhas.some((l) => !l.completo)),
  };
}

export type PainelFrprt = NonNullable<Awaited<ReturnType<typeof calcularPainelFrprt>>>;
