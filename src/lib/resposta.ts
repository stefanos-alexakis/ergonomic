import { db } from "@/lib/db";
import { normalizarCodigo } from "@/lib/codigo";
import { pesquisaAceitaAcesso } from "@/lib/vigencia-pesquisa";
import { montarPaginas } from "@/lib/paginacao-questionario";

/**
 * Resolve pesquisa por slug composto (workspace + pesquisa) — a única
 * forma de chegar numa pesquisa pela jornada pública. Não existe em
 * lugar nenhum uma consulta que aceite `pesquisaId` cru vindo do
 * cliente sem passar por aqui (constitution.md §2).
 */
/** Só o workspace — usado pelo cabeçalho da jornada (logo/nome), que
 * precisa aparecer mesmo nas telas em que a pesquisa ainda não foi
 * resolvida (ex.: código inválido). */
export async function resolveWorkspacePublico(workspaceSlug: string) {
  return db.workspace.findFirst({ where: { slug: workspaceSlug, isActive: true, deletedAt: null } });
}

export async function resolvePesquisaPublica(workspaceSlug: string, pesquisaSlug: string) {
  return db.pesquisa.findFirst({
    where: { slug: pesquisaSlug, workspace: { slug: workspaceSlug, isActive: true, deletedAt: null } },
    include: { workspace: true },
  });
}

export type ResultadoIniciar =
  | { ok: true; codigoAcessoId: string }
  | { ok: false; erro: string };

/**
 * Primeiro contato do colaborador com o código. Nunca cria nada além
 * do necessário: só marca o código como INICIADO na primeira vez —
 * reentradas com o mesmo código apenas retomam.
 */
export async function iniciarComCodigo(
  pesquisaId: string,
  codigoDigitado: string,
): Promise<ResultadoIniciar> {
  const pesquisa = await db.pesquisa.findUnique({ where: { id: pesquisaId } });
  if (!pesquisa) return { ok: false, erro: "Pesquisa não encontrada." };

  const codigo = normalizarCodigo(codigoDigitado);
  const codigoAcesso = await db.codigoAcesso.findFirst({ where: { pesquisaId, codigo } });
  if (!codigoAcesso) return { ok: false, erro: "Código inválido para esta pesquisa." };

  if (codigoAcesso.status === "BLOQUEADO") {
    return { ok: false, erro: "Este código está bloqueado." };
  }
  if (codigoAcesso.status === "CONCLUIDO") {
    return { ok: true, codigoAcessoId: codigoAcesso.id }; // deixa a página mostrar "já concluído"
  }

  const jaIniciado = codigoAcesso.status === "INICIADO";
  if (!pesquisaAceitaAcesso(pesquisa, { jaIniciado })) {
    return { ok: false, erro: "Esta pesquisa está encerrada." };
  }

  if (codigoAcesso.status === "DISPONIVEL") {
    await db.$transaction([
      db.codigoAcesso.update({ where: { id: codigoAcesso.id }, data: { status: "INICIADO" } }),
      db.resposta.upsert({
        where: { codigoAcessoId: codigoAcesso.id },
        update: {},
        create: { codigoAcessoId: codigoAcesso.id },
      }),
    ]);
  }

  return { ok: true, codigoAcessoId: codigoAcesso.id };
}

export type EstadoJornada =
  | { tipo: "invalido" }
  | { tipo: "encerrada" }
  | { tipo: "concluido" }
  | { tipo: "selecionar_organizacao"; respostaId: string }
  | { tipo: "questionario"; respostaId: string };

/**
 * Carrega o estado atual da resposta a partir do código guardado no
 * cookie — nunca a partir de um id que o cliente possa forjar; o
 * cookie guarda só o `codigoAcessoId`, que é tão opaco quanto o
 * próprio código impresso no cartão.
 */
export async function carregarEstadoJornada(
  pesquisaId: string,
  codigoAcessoId: string,
): Promise<EstadoJornada> {
  const codigoAcesso = await db.codigoAcesso.findFirst({
    where: { id: codigoAcessoId, pesquisaId },
    include: { resposta: true, pesquisa: true },
  });
  if (!codigoAcesso || !codigoAcesso.resposta) return { tipo: "invalido" };

  if (codigoAcesso.status === "CONCLUIDO" || codigoAcesso.resposta.concluidoEm) {
    return { tipo: "concluido" };
  }

  if (!pesquisaAceitaAcesso(codigoAcesso.pesquisa, { jaIniciado: true })) {
    return { tipo: "encerrada" };
  }

  if (!codigoAcesso.resposta.setorId || !codigoAcesso.resposta.departamentoId) {
    return { tipo: "selecionar_organizacao", respostaId: codigoAcesso.resposta.id };
  }

  return { tipo: "questionario", respostaId: codigoAcesso.resposta.id };
}

export type ResultadoSalvarOrganizacao = { ok: true } | { ok: false; erro: string };

/**
 * Grava setor/departamento — confirmando que cada id recebido pertence
 * de verdade ao workspace desta pesquisa antes de salvar (review.md
 * R6b: nenhum dado da rota pública entra sem essa checagem, senão uma
 * resposta poderia ficar marcada com estrutura de outra empresa).
 *
 * Segmento/função saíram da interface (a pedido do cliente) — as
 * colunas continuam existindo em Resposta, apenas nunca mais são
 * escritas por aqui; pesquisas antigas mantêm o dado histórico.
 */
export async function salvarOrganizacao(
  respostaId: string,
  workspaceId: string,
  input: { setorId: string; departamentoId: string },
): Promise<ResultadoSalvarOrganizacao> {
  const [setor, departamento] = await Promise.all([
    db.setorOrg.findFirst({ where: { id: input.setorId, workspaceId } }),
    db.departamento.findFirst({ where: { id: input.departamentoId, workspaceId } }),
  ]);

  if (!setor || !departamento) {
    return { ok: false, erro: "Setor ou departamento inválido para esta empresa." };
  }

  await db.resposta.update({
    where: { id: respostaId },
    data: { setorId: setor.id, departamentoId: departamento.id },
  });
  return { ok: true };
}

export async function carregarPaginasQuestionario(questionarioId: string, tamanhoPagina?: number) {
  const blocos = await db.bloco.findMany({
    where: { questionarioId },
    orderBy: { ordem: "asc" },
    include: {
      dimensoes: {
        orderBy: { ordem: "asc" },
        include: {
          fatoresRisco: { include: { perguntas: { orderBy: { ordemGlobal: "asc" } } } },
        },
      },
    },
  });

  const blocosComPerguntas = blocos.map((b) => ({
    blocoId: b.id,
    blocoNome: b.nome,
    perguntas: b.dimensoes.flatMap((d) =>
      d.fatoresRisco.flatMap((f) => f.perguntas.map((p) => ({ id: p.id, texto: p.texto, ordemGlobal: p.ordemGlobal }))),
    ),
  }));

  return montarPaginas(blocosComPerguntas, tamanhoPagina);
}

export type ResultadoSalvarPagina = { ok: true } | { ok: false; erro: string };

/**
 * Grava as respostas de uma página inteira. Todas as perguntas da
 * página são obrigatórias — validado aqui de novo, não só na tela
 * (tasks.md Fase 5).
 */
export async function salvarPagina(
  respostaId: string,
  itens: { perguntaId: string; valor: number }[],
): Promise<ResultadoSalvarPagina> {
  if (itens.some((i) => !Number.isInteger(i.valor) || i.valor < 1 || i.valor > 5)) {
    return { ok: false, erro: "Todas as perguntas desta página precisam de uma resposta." };
  }

  await db.$transaction(
    itens.map((item) =>
      db.respostaItem.upsert({
        where: { respostaId_perguntaId: { respostaId, perguntaId: item.perguntaId } },
        update: { valor: item.valor },
        create: { respostaId, perguntaId: item.perguntaId, valor: item.valor },
      }),
    ),
  );
  return { ok: true };
}

export async function carregarRespostasSalvas(respostaId: string) {
  const itens = await db.respostaItem.findMany({ where: { respostaId } });
  return new Map(itens.map((i) => [i.perguntaId, i.valor]));
}

/**
 * Conclui em definitivo — idempotente (review.md §3.2): chamar de novo
 * numa resposta já concluída não é erro, só confirma de novo.
 */
export async function concluirResposta(respostaId: string): Promise<{ ok: true }> {
  const resposta = await db.resposta.findUnique({ where: { id: respostaId } });
  if (!resposta) return { ok: true };
  if (resposta.concluidoEm) return { ok: true };

  await db.$transaction([
    db.resposta.update({ where: { id: respostaId }, data: { concluidoEm: new Date() } }),
    db.codigoAcesso.update({ where: { id: resposta.codigoAcessoId }, data: { status: "CONCLUIDO" } }),
  ]);
  return { ok: true };
}
