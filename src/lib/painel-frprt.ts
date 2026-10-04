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
  ocorrenciasRelacionadas: number;
  fatoresAgravados: number;
  celulas: CelulaPainel[];
};

export type ResultadoGeral = {
  final: number;
  nota: number;
  conclusao: Conclusao;
  setoresAvaliados: number;
  setoresEmRisco: number;
  fatoresPgr: number;
  participacao: number | null;
  efeitoEixo2: number | null;
  efeitoEixo3: number | null;
};

export type Achado = { tom: "perigo" | "atencao" | "sucesso" | "neutro"; texto: string };

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
      ocorrenciasRelacionadas: e3?.relacionadas ?? 0,
      fatoresAgravados: celulas.filter((c) => c.fatorEixo3 > 1).length,
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

  const geral = calcularGeral(linhas);
  const achados = gerarAchados({ linhas, geral, principais, temEixo2: Boolean(avaliacao), temEixo3: Boolean(levantamento) });

  return {
    opcoes,
    fatores,
    limite,
    linhas,
    geral,
    achados,
    principais: principais.map((p) => ({ ...p, tratativas: (sugeridosPorFator.get(p.fator.id) ?? []).slice(0, 3) })),
    pgr,
    avaliacaoIncompleta: Boolean(eixo2?.linhas.some((l) => !l.completo)),
  };
}

export type PainelFrprt = NonNullable<Awaited<ReturnType<typeof calcularPainelFrprt>>>;

/**
 * Resultado geral da empresa: média simples do risco final dos setores com
 * score (cada setor pesa igual — fácil de explicar; o setor pequeno demais
 * para o anonimato fica de fora, como no resto do painel).
 */
export function calcularGeral(linhas: LinhaSetorPainel[]): ResultadoGeral | null {
  const comScore = linhas.filter((l) => l.final !== null);
  if (comScore.length === 0) return null;
  const media = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const final = media(comScore.map((l) => l.final))!;
  const comHeadcount = linhas.filter((l) => l.colaboradores && l.colaboradores > 0);
  const totalColab = comHeadcount.reduce((a, l) => a + (l.colaboradores ?? 0), 0);
  return {
    final,
    nota: notaDoRisco(final),
    conclusao: concluir(final),
    setoresAvaliados: comScore.length,
    setoresEmRisco: comScore.filter((l) => l.conclusao === "RISCO_EXISTENTE").length,
    fatoresPgr: comScore.reduce((a, l) => a + l.fatoresEmRisco, 0),
    participacao: totalColab > 0 ? comHeadcount.reduce((a, l) => a + l.respondentes, 0) / totalColab : null,
    efeitoEixo2: media(comScore.map((l) => l.efeitoEixo2)),
    efeitoEixo3: media(comScore.map((l) => l.efeitoEixo3)),
  };
}

const virgula = (n: number, casas = 2) => n.toFixed(casas).replace(".", ",");

/** Frases curtas com o que mais importa — mesmas no painel e no PDF. */
export function gerarAchados(params: {
  linhas: LinhaSetorPainel[];
  geral: ResultadoGeral | null;
  principais: { fator: { id: string; nome: string }; percentual: number; mediaFinal: number }[];
  temEixo2: boolean;
  temEixo3: boolean;
}): Achado[] {
  const { linhas, geral, principais, temEixo2, temEixo3 } = params;
  const achados: Achado[] = [];
  const comScore = linhas.filter((l) => l.final !== null);
  if (!geral || comScore.length === 0) return achados;

  const critico = [...comScore].sort((a, b) => b.final! - a.final!)[0]!;
  achados.push({
    tom: critico.conclusao === "RISCO_EXISTENTE" ? "perigo" : critico.conclusao === "CONTROLE" ? "atencao" : "sucesso",
    texto:
      comScore.length > 1
        ? `${critico.nome} é o setor mais crítico (${virgula(critico.final!)})${critico.fatoresEmRisco ? `, com ${critico.fatoresEmRisco} fator(es) para o PGR` : ""}.`
        : `${critico.nome}: risco final ${virgula(critico.final!)}${critico.fatoresEmRisco ? `, com ${critico.fatoresEmRisco} fator(es) para o PGR` : ""}.`,
  });

  const fatorCritico = principais[0] ?? null;
  if (fatorCritico) {
    achados.push({
      tom: fatorCritico.mediaFinal > 4 ? "perigo" : "atencao",
      texto: `${fatorCritico.fator.nome} é o fator mais crítico: acima de 3,00 em ${Math.round(fatorCritico.percentual * 100)}% dos setores (média ${virgula(fatorCritico.mediaFinal)}).`,
    });
  }

  if (geral.fatoresPgr > 0) {
    achados.push({
      tom: "perigo",
      texto: `${geral.fatoresPgr} combinação(ões) setor × fator acima de 4,00 vão para o PGR com plano de ação.`,
    });
  } else {
    achados.push({ tom: "sucesso", texto: "Nenhum fator acima de 4,00 — nada entra automaticamente no PGR." });
  }

  if (temEixo2 && geral.efeitoEixo2 !== null) {
    achados.push({
      tom: geral.efeitoEixo2 <= -0.5 ? "sucesso" : geral.efeitoEixo2 < 0 ? "atencao" : "perigo",
      texto:
        geral.efeitoEixo2 < 0
          ? `As medidas de controle da empresa (Eixo 2) reduziram o risco em ${virgula(Math.abs(geral.efeitoEixo2))} ponto(s) em média.`
          : "As medidas de controle (Eixo 2) não atenuaram o risco — medidas inexistentes ou a melhorar.",
    });
  } else {
    achados.push({ tom: "neutro", texto: "Eixo 2 não considerado: as medidas de controle ainda não foram avaliadas." });
  }

  if (temEixo3) {
    const ocorr = comScore.reduce((a, l) => a + l.ocorrenciasRelacionadas, 0);
    const setoresAgravados = comScore.filter((l) => l.fatoresAgravados > 0);
    achados.push(
      ocorr > 0
        ? {
            tom: "perigo",
            texto: `${ocorr} atestado(s) CID-F relacionado(s) ao trabalho agravaram fatores em ${setoresAgravados.length} setor(es): ${setoresAgravados.map((l) => l.nome).join(", ")}.`,
          }
        : { tom: "sucesso", texto: "Nenhum atestado CID-F relacionado ao trabalho nos setores avaliados (Eixo 3)." },
    );
  } else {
    achados.push({ tom: "neutro", texto: "Eixo 3 não considerado: nenhum levantamento de atestados publicado." });
  }

  const suprimidos = linhas.filter((l) => l.suprimido).length;
  if (suprimidos > 0) {
    achados.push({
      tom: "neutro",
      texto: `${suprimidos} setor(es) com poucas respostas ficaram fora do cálculo para proteger o anonimato.`,
    });
  }
  return achados;
}