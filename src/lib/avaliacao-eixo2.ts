import { db } from "@/lib/db";
import { calcularFatorEixo2, ehCondicao, type Condicao } from "@/lib/eixo2";

/**
 * Avaliação do Eixo 2: a empresa responde, por setor, se existem medidas de
 * controle para cada fator de risco. Toda função recebe o `workspaceId` já
 * resolvido pelo chamador (getWorkspaceDoGestor) e filtra por ele — um id
 * de avaliação, setor ou questão de outra empresa nunca é aceito
 * (constitution.md §2).
 */

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

const QUESTAO_DA_AVALIACAO = (questionarioId: string) => ({
  perguntaEixo1: { fatorRisco: { dimensao: { bloco: { questionarioId } } } },
});

export async function listarAvaliacoes(workspaceId: string) {
  const avaliacoes = await db.avaliacaoEixo2.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { setores: true } } },
  });
  return Promise.all(
    avaliacoes.map(async (a) => ({ ...a, progresso: await calcularProgresso(a.id, a.questionarioId) })),
  );
}

export async function resolverAvaliacao(id: string, workspaceId: string) {
  return db.avaliacaoEixo2.findFirst({
    where: { id, workspaceId },
    include: { setores: { include: { setor: true }, orderBy: { setor: { nome: "asc" } } } },
  });
}

/** Setores informados existem e são desta empresa? Devolve os válidos. */
async function setoresDaEmpresa(workspaceId: string, setorIds: string[]) {
  const unicos = [...new Set(setorIds)];
  const setores = await db.setorOrg.findMany({ where: { id: { in: unicos }, workspaceId }, select: { id: true } });
  return setores.length === unicos.length ? unicos : null;
}

export async function criarAvaliacao(
  workspaceId: string,
  input: { nome: string; participantes?: string; setorIds: string[] },
): Promise<Resultado<{ id: string }>> {
  const nome = input.nome.trim();
  if (nome.length < 2) return { ok: false, erro: "Dê um nome à avaliação (ex.: Avaliação Out/2026)." };
  if (input.setorIds.length === 0) return { ok: false, erro: "Selecione pelo menos um setor." };

  const setorIds = await setoresDaEmpresa(workspaceId, input.setorIds);
  if (!setorIds) return { ok: false, erro: "Setor inválido para esta empresa." };

  const questionario = await db.questionario.findFirst({ where: { ativo: true } });
  if (!questionario) return { ok: false, erro: "Nenhum questionário ativo cadastrado na plataforma." };
  const totalQuestoes = await db.questaoEixo2.count({ where: QUESTAO_DA_AVALIACAO(questionario.id) });
  if (totalQuestoes === 0) return { ok: false, erro: "O questionário ativo não tem perguntas do Eixo 2." };

  const avaliacao = await db.avaliacaoEixo2.create({
    data: {
      workspaceId,
      questionarioId: questionario.id,
      nome,
      participantes: input.participantes?.trim() || null,
      setores: { create: setorIds.map((setorId) => ({ setorId })) },
    },
  });
  return { ok: true, id: avaliacao.id };
}

/**
 * Troca os setores da avaliação. Setor que sai perde as respostas dele
 * nesta avaliação; setor que entra herda as respostas que estão iguais
 * para todos os setores que já estavam (é o que o modo "mesma resposta
 * para todos" representa), para não começar do zero.
 */
export async function definirSetores(
  avaliacaoId: string,
  workspaceId: string,
  setorIdsNovos: string[],
): Promise<Resultado> {
  const avaliacao = await resolverAvaliacao(avaliacaoId, workspaceId);
  if (!avaliacao) return { ok: false, erro: "Avaliação não encontrada." };
  if (avaliacao.status === "CONCLUIDA") return { ok: false, erro: "Reabra a avaliação para alterar os setores." };
  if (setorIdsNovos.length === 0) return { ok: false, erro: "Selecione pelo menos um setor." };

  const setorIds = await setoresDaEmpresa(workspaceId, setorIdsNovos);
  if (!setorIds) return { ok: false, erro: "Setor inválido para esta empresa." };

  const atuais = avaliacao.setores.map((s) => s.setorId);
  const entram = setorIds.filter((id) => !atuais.includes(id));
  const saem = atuais.filter((id) => !setorIds.includes(id));

  const herdadas: { questaoId: string; condicao: Condicao; planoAcao: string | null; justificativa: string | null }[] =
    [];
  if (entram.length > 0 && atuais.length > 0) {
    const respostas = await db.respostaEixo2.findMany({ where: { avaliacaoId, setorId: { in: atuais } } });
    const porQuestao = new Map<string, typeof respostas>();
    for (const r of respostas) porQuestao.set(r.questaoId, [...(porQuestao.get(r.questaoId) ?? []), r]);
    for (const [questaoId, lista] of porQuestao) {
      const [primeira] = lista;
      const unanime =
        primeira &&
        lista.length === atuais.length &&
        lista.every(
          (r) =>
            r.condicao === primeira.condicao &&
            r.planoAcao === primeira.planoAcao &&
            r.justificativa === primeira.justificativa,
        );
      if (unanime) {
        herdadas.push({
          questaoId,
          condicao: primeira.condicao,
          planoAcao: primeira.planoAcao,
          justificativa: primeira.justificativa,
        });
      }
    }
  }

  await db.$transaction([
    db.respostaEixo2.deleteMany({ where: { avaliacaoId, setorId: { in: saem } } }),
    db.avaliacaoEixo2Setor.deleteMany({ where: { avaliacaoId, setorId: { in: saem } } }),
    db.avaliacaoEixo2Setor.createMany({ data: entram.map((setorId) => ({ avaliacaoId, setorId })) }),
    db.respostaEixo2.createMany({
      data: entram.flatMap((setorId) => herdadas.map((h) => ({ avaliacaoId, setorId, ...h }))),
    }),
  ]);
  return { ok: true };
}

export type DadosFormulario = Awaited<ReturnType<typeof carregarFormulario>>;

/** Questões agrupadas por dimensão (as 13 da metodologia) + respostas por setor. */
export async function carregarFormulario(avaliacaoId: string, questionarioId: string) {
  const [questoes, respostas] = await Promise.all([
    db.questaoEixo2.findMany({
      where: QUESTAO_DA_AVALIACAO(questionarioId),
      orderBy: { ordem: "asc" },
      include: {
        perguntaEixo1: {
          select: {
            texto: true,
            exemplo: true,
            fatorRisco: { select: { nome: true, dimensao: { select: { id: true, nome: true, ordem: true, bloco: { select: { ordem: true } } } } } },
          },
        },
      },
    }),
    db.respostaEixo2.findMany({ where: { avaliacaoId } }),
  ]);

  const dimensoes: {
    id: string;
    nome: string;
    fator: string;
    questoes: {
      id: string;
      ordem: number;
      texto: string;
      planoSugerido: string | null;
      perguntaColaborador: string;
      peso: number;
      perguntaEixo1Id: string;
    }[];
  }[] = [];

  for (const q of questoes) {
    const dim = q.perguntaEixo1.fatorRisco.dimensao;
    let grupo = dimensoes.find((d) => d.id === dim.id);
    if (!grupo) {
      grupo = { id: dim.id, nome: dim.nome, fator: q.perguntaEixo1.fatorRisco.nome, questoes: [] };
      dimensoes.push(grupo);
    }
    grupo.questoes.push({
      id: q.id,
      perguntaEixo1Id: q.perguntaEixo1Id,
      ordem: q.ordem,
      texto: q.texto,
      planoSugerido: q.planoSugerido,
      perguntaColaborador: q.perguntaEixo1.texto,
      peso: q.peso,
    });
  }

  const porChave: Record<string, { condicao: Condicao; planoAcao: string | null; justificativa: string | null }> = {};
  for (const r of respostas) {
    porChave[`${r.questaoId}:${r.setorId}`] = {
      condicao: r.condicao,
      planoAcao: r.planoAcao,
      justificativa: r.justificativa,
    };
  }

  return { dimensoes, respostas: porChave };
}

/** Questões respondidas em TODOS os setores da avaliação / total. */
export async function calcularProgresso(avaliacaoId: string, questionarioId: string) {
  const [total, setores, porQuestao] = await Promise.all([
    db.questaoEixo2.count({ where: QUESTAO_DA_AVALIACAO(questionarioId) }),
    db.avaliacaoEixo2Setor.count({ where: { avaliacaoId } }),
    db.respostaEixo2.groupBy({ by: ["questaoId"], where: { avaliacaoId }, _count: { _all: true } }),
  ]);
  const completas = setores === 0 ? 0 : porQuestao.filter((q) => q._count._all >= setores).length;
  return { total, completas };
}

/**
 * Grava uma resposta em um ou vários setores de uma vez (o modo "mesma
 * resposta para todos" manda todos os setores). Campos ausentes ficam como
 * estão — dá para salvar só o plano de ação sem reenviar a condição.
 */
export async function salvarResposta(
  avaliacaoId: string,
  workspaceId: string,
  input: {
    questaoId: string;
    setorIds: string[];
    condicao?: string;
    planoAcao?: string | null;
    justificativa?: string | null;
  },
): Promise<Resultado> {
  const avaliacao = await resolverAvaliacao(avaliacaoId, workspaceId);
  if (!avaliacao) return { ok: false, erro: "Avaliação não encontrada." };
  if (avaliacao.status === "CONCLUIDA") return { ok: false, erro: "Avaliação concluída — reabra para editar." };

  if (input.condicao !== undefined && !ehCondicao(input.condicao)) {
    return { ok: false, erro: "Resposta inválida." };
  }
  const condicao = input.condicao as Condicao | undefined;

  const doAvaliacao = new Set(avaliacao.setores.map((s) => s.setorId));
  const setorIds = [...new Set(input.setorIds)];
  if (setorIds.length === 0 || setorIds.some((id) => !doAvaliacao.has(id))) {
    return { ok: false, erro: "Setor fora desta avaliação." };
  }

  const questao = await db.questaoEixo2.findFirst({
    where: { id: input.questaoId, ...QUESTAO_DA_AVALIACAO(avaliacao.questionarioId) },
    select: { id: true },
  });
  if (!questao) return { ok: false, erro: "Pergunta inválida para esta avaliação." };

  const limpar = (texto: string | null | undefined) =>
    texto === undefined ? undefined : texto === null ? null : texto.trim() === "" ? null : texto.slice(0, 5000);
  const planoAcao = limpar(input.planoAcao);
  const justificativa = limpar(input.justificativa);

  const existentes = await db.respostaEixo2.findMany({
    where: { avaliacaoId, questaoId: questao.id, setorId: { in: setorIds } },
    select: { setorId: true },
  });
  const jaTem = new Set(existentes.map((r) => r.setorId));
  if (!condicao && setorIds.some((id) => !jaTem.has(id))) {
    return { ok: false, erro: "Escolha a resposta antes do plano de ação." };
  }

  const atualizar = {
    ...(condicao ? { condicao } : {}),
    ...(planoAcao !== undefined ? { planoAcao } : {}),
    ...(justificativa !== undefined ? { justificativa } : {}),
  };

  // Sem condição (só plano/justificativa), todas as linhas já existem — a
  // checagem acima garante. Não dá para usar upsert aqui: o Prisma valida o
  // ramo `create` mesmo quando a linha existe, e ele exige `condicao`
  // (bug achado pelo E2E ao salvar só o plano de ação).
  if (!condicao) {
    await db.respostaEixo2.updateMany({
      where: { avaliacaoId, questaoId: questao.id, setorId: { in: setorIds } },
      data: atualizar,
    });
    return { ok: true };
  }

  await db.$transaction(
    setorIds.map((setorId) =>
      db.respostaEixo2.upsert({
        where: { avaliacaoId_questaoId_setorId: { avaliacaoId, questaoId: questao.id, setorId } },
        update: atualizar,
        create: {
          avaliacaoId,
          questaoId: questao.id,
          setorId,
          condicao,
          planoAcao: planoAcao ?? null,
          justificativa: justificativa ?? null,
        },
      }),
    ),
  );
  return { ok: true };
}

export async function salvarFechamento(
  avaliacaoId: string,
  workspaceId: string,
  input: {
    participantes: string;
    responsavel: string;
    observacaoFinal: string;
    praticas: { descricao: string; frequencia: string; evidencia: string }[];
  },
): Promise<Resultado> {
  const avaliacao = await resolverAvaliacao(avaliacaoId, workspaceId);
  if (!avaliacao) return { ok: false, erro: "Avaliação não encontrada." };
  if (avaliacao.status === "CONCLUIDA") return { ok: false, erro: "Avaliação concluída — reabra para editar." };

  const praticas = input.praticas
    .map((p) => ({ descricao: p.descricao.trim(), frequencia: p.frequencia.trim(), evidencia: p.evidencia.trim() }))
    .filter((p) => p.descricao)
    .slice(0, 50);

  await db.$transaction([
    db.avaliacaoEixo2.update({
      where: { id: avaliacao.id },
      data: {
        participantes: input.participantes.trim() || null,
        responsavel: input.responsavel.trim() || null,
        observacaoFinal: input.observacaoFinal.trim() || null,
      },
    }),
    db.praticaAdicional.deleteMany({ where: { avaliacaoId: avaliacao.id } }),
    db.praticaAdicional.createMany({
      data: praticas.map((p, i) => ({
        avaliacaoId: avaliacao.id,
        descricao: p.descricao,
        frequencia: p.frequencia || null,
        evidencia: p.evidencia || null,
        ordem: i + 1,
      })),
    }),
  ]);
  return { ok: true };
}

export async function concluirAvaliacao(avaliacaoId: string, workspaceId: string): Promise<Resultado> {
  const avaliacao = await resolverAvaliacao(avaliacaoId, workspaceId);
  if (!avaliacao) return { ok: false, erro: "Avaliação não encontrada." };
  const { total, completas } = await calcularProgresso(avaliacao.id, avaliacao.questionarioId);
  if (completas < total) {
    return { ok: false, erro: `Faltam ${total - completas} pergunta(s) sem resposta em algum setor.` };
  }
  await db.avaliacaoEixo2.update({
    where: { id: avaliacao.id },
    data: { status: "CONCLUIDA", concluidaEm: new Date() },
  });
  return { ok: true };
}

export async function reabrirAvaliacao(avaliacaoId: string, workspaceId: string): Promise<Resultado> {
  const r = await db.avaliacaoEixo2.updateMany({
    where: { id: avaliacaoId, workspaceId },
    data: { status: "RASCUNHO", concluidaEm: null },
  });
  return r.count === 1 ? { ok: true } : { ok: false, erro: "Avaliação não encontrada." };
}

export async function excluirAvaliacao(avaliacaoId: string, workspaceId: string): Promise<Resultado> {
  const r = await db.avaliacaoEixo2.deleteMany({ where: { id: avaliacaoId, workspaceId } });
  return r.count === 1 ? { ok: true } : { ok: false, erro: "Avaliação não encontrada." };
}

/**
 * Resultado: fator do Eixo 2 por setor × fator de risco (dimensão) e por
 * setor no geral, ponderado pelos pesos vigentes das questões.
 */
export async function calcularResultado(avaliacaoId: string, questionarioId: string, setores: { id: string; nome: string }[]) {
  const { dimensoes, respostas } = await carregarFormulario(avaliacaoId, questionarioId);

  const linhas = setores.map((setor) => {
    const todasDoSetor: { condicao: Condicao; peso: number }[] = [];
    const porDimensao: Record<string, number | null> = {};
    // Fator de cada situação (pergunta do Eixo 1) — usado no PGR por situação.
    const porPergunta: Record<string, number | null> = {};
    let respondidas = 0;
    let totalQuestoes = 0;
    for (const d of dimensoes) {
      const itens: { condicao: Condicao; peso: number }[] = [];
      for (const q of d.questoes) {
        totalQuestoes++;
        const r = respostas[`${q.id}:${setor.id}`];
        porPergunta[q.perguntaEixo1Id] = r ? calcularFatorEixo2([{ condicao: r.condicao, peso: q.peso }]) : null;
        if (r) {
          respondidas++;
          itens.push({ condicao: r.condicao, peso: q.peso });
        }
      }
      porDimensao[d.id] = calcularFatorEixo2(itens);
      todasDoSetor.push(...itens);
    }
    return {
      setor,
      porDimensao,
      porPergunta,
      geral: calcularFatorEixo2(todasDoSetor),
      completo: respondidas === totalQuestoes,
    };
  });

  const planos: {
    setor: string;
    dimensao: string;
    ordem: number;
    questao: string;
    condicao: Condicao;
    plano: string;
  }[] = [];
  for (const d of dimensoes) {
    for (const q of d.questoes) {
      for (const s of setores) {
        const r = respostas[`${q.id}:${s.id}`];
        if (r?.planoAcao) {
          planos.push({ setor: s.nome, dimensao: d.nome, ordem: q.ordem, questao: q.texto, condicao: r.condicao, plano: r.planoAcao });
        }
      }
    }
  }

  return { dimensoes: dimensoes.map((d) => ({ id: d.id, nome: d.nome, fator: d.fator })), linhas, planos };
}
