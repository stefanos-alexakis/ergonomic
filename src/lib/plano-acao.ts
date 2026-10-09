import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { calcularPainelFrprt, type PainelFrprt } from "@/lib/painel-frprt";
import { carregarRegrasPrazo } from "@/lib/prazos";
import { PRIORIDADES, calcularPrazos, type Prioridade } from "@/lib/fmea";
import {
  EFICACIAS,
  FASES,
  LIMITES,
  agruparPlanosEixo2,
  dataIso,
  diaDe,
  formatarDia,
  formatarReais,
  hojeIso,
  lerData,
  lerReais,
  normalizarTexto,
  semCrlf,
  type Eficacia,
  type Fase,
} from "@/lib/plano-acao-util";

/**
 * Plano de ação (5W2H + PDCA). Todo acesso passa por `workspaceId` já
 * resolvido pela sessão (constitution.md §2): ação de outra empresa é
 * tratada como inexistente. Edições usam trava otimista pela versão
 * (`atualizadoEm`) — gestor e consultor podem editar ao mesmo tempo sem
 * um apagar o trabalho do outro.
 */

export type Autor = { userId: string; nome: string };

/** Quem está agindo, para o histórico. Admin da plataforma aparece como consultoria. */
export async function autorDe(actor: { userId: string; isPlatformAdmin: boolean }): Promise<Autor> {
  const u = await db.user.findUnique({ where: { id: actor.userId }, select: { nome: true, email: true } });
  const nome = u?.nome || u?.email || "Usuário";
  return { userId: actor.userId, nome: actor.isPlatformAdmin ? `${nome} (consultoria)` : nome };
}

const incluirAcao = {
  setores: { include: { setor: { select: { id: true, nome: true } } } },
  dimensao: { select: { id: true, nome: true } },
  questaoEixo2: { select: { id: true, texto: true, ordem: true } },
  origemAvaliacao: { select: { id: true, nome: true } },
  acaoOrigem: { select: { id: true, numero: true } },
  corretivas: { select: { id: true, numero: true, fase: true } },
} satisfies Prisma.AcaoPlanoInclude;

export type AcaoCompleta = Prisma.AcaoPlanoGetPayload<{ include: typeof incluirAcao }>;

export async function listarAcoes(workspaceId: string): Promise<AcaoCompleta[]> {
  return db.acaoPlano.findMany({ where: { workspaceId }, include: incluirAcao, orderBy: { numero: "asc" } });
}

export async function obterAcao(id: string, workspaceId: string) {
  return db.acaoPlano.findFirst({
    where: { id, workspaceId },
    include: { ...incluirAcao, historico: { orderBy: { criadoEm: "desc" } } },
  });
}

// ── Dados do formulário 5W2H ──────────────────────────────────────────

export type DadosAcao = {
  oque: string;
  porque: string | null;
  como: string | null;
  responsavel: string | null;
  cargoResponsavel: string | null;
  inicio: Date | null;
  prazo: Date | null;
  reavaliarEm: Date | null;
  custoCentavos: number | null;
  custoObservacao: string | null;
  dimensaoId: string | null;
  setorIds: string[];
};

const texto = (fd: FormData, campo: string) => semCrlf(String(fd.get(campo) ?? ""));
const opcional = (v: string) => (v === "" ? null : v);

export function lerDadosAcao(fd: FormData): DadosAcao | { erro: string } {
  const oque = texto(fd, "oque");
  if (oque.length < 3) return { erro: "Descreva a ação (o quê)." };
  if (oque.length > LIMITES.oque) return { erro: `"O quê" com no máximo ${LIMITES.oque} caracteres.` };
  for (const [campo, rotulo, max] of [
    ["porque", "Por quê", LIMITES.textoLongo],
    ["como", "Como", LIMITES.textoLongo],
    ["custoObservacao", "Observação do custo", LIMITES.textoLongo],
    ["responsavel", "Responsável", LIMITES.responsavel],
    ["cargoResponsavel", "Cargo", LIMITES.cargo],
  ] as const) {
    if (texto(fd, campo).length > max) return { erro: `${rotulo}: no máximo ${max} caracteres.` };
  }
  const datas: Record<"inicio" | "prazo" | "reavaliarEm", Date | null> = { inicio: null, prazo: null, reavaliarEm: null };
  for (const campo of ["inicio", "prazo", "reavaliarEm"] as const) {
    const d = lerData(texto(fd, campo));
    if (d === undefined) return { erro: "Data inválida." };
    datas[campo] = d;
  }
  if (datas.inicio && datas.prazo && datas.prazo < datas.inicio) return { erro: "O prazo não pode ser antes do início." };
  const custo = lerReais(texto(fd, "custo"));
  if (!custo.ok) return { erro: custo.erro };
  const setorIds = [...new Set(fd.getAll("setores").map(String).filter(Boolean))];
  return {
    oque,
    porque: opcional(texto(fd, "porque")),
    como: opcional(texto(fd, "como")),
    responsavel: opcional(texto(fd, "responsavel")),
    cargoResponsavel: opcional(texto(fd, "cargoResponsavel")),
    ...datas,
    custoCentavos: custo.centavos,
    custoObservacao: opcional(texto(fd, "custoObservacao")),
    dimensaoId: opcional(texto(fd, "dimensaoId")),
    setorIds,
  };
}

/** Setores e fator precisam ser desta empresa / do questionário ativo. */
async function validarVinculos(workspaceId: string, d: { setorIds: string[]; dimensaoId: string | null }) {
  if (d.setorIds.length > 0) {
    const n = await db.setorOrg.count({ where: { workspaceId, id: { in: d.setorIds } } });
    if (n !== d.setorIds.length) return "Setor inválido. Recarregue a página.";
  }
  if (d.dimensaoId) {
    const ok = await db.dimensao.count({ where: { id: d.dimensaoId, bloco: { questionario: { ativo: true } } } });
    if (!ok) return "Fator inválido. Recarregue a página.";
  }
  return null;
}

async function registrar(tx: Prisma.TransactionClient, acaoId: string, autor: Autor, tipo: string, descricao: string) {
  await tx.acaoPlanoHistorico.create({ data: { acaoId, userId: autor.userId, autor: autor.nome, tipo, descricao } });
}

/** Número sequencial por empresa (#1, #2…), resistente a duas criações simultâneas. */
async function criarComNumero(
  workspaceId: string,
  criar: (tx: Prisma.TransactionClient, numero: number) => Promise<{ id: string }>,
): Promise<string> {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      return await db.$transaction(async (tx) => {
        const max = await tx.acaoPlano.aggregate({ where: { workspaceId }, _max: { numero: true } });
        const { id } = await criar(tx, (max._max.numero ?? 0) + 1);
        return id;
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Não foi possível numerar a ação. Tente de novo.");
}

export async function criarAcao(
  workspaceId: string,
  dados: DadosAcao,
  autor: Autor,
  extras: Partial<Pick<Prisma.AcaoPlanoUncheckedCreateInput, "questaoEixo2Id" | "textoOrigem" | "origemAvaliacaoId" | "prioridade" | "acaoOrigemId">> & {
    indiceBase?: Map<string, number | null>;
    descricaoHistorico?: string;
  } = {},
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const erro = await validarVinculos(workspaceId, dados);
  if (erro) return { ok: false, erro };
  const { setorIds, ...campos } = dados;
  const { indiceBase, descricaoHistorico, ...origem } = extras;
  const id = await criarComNumero(workspaceId, async (tx, numero) => {
    const acao = await tx.acaoPlano.create({
      data: {
        workspaceId,
        numero,
        ...campos,
        ...origem,
        criadoPorId: autor.userId,
        setores: { create: setorIds.map((setorId) => ({ setorId, indiceBase: indiceBase?.get(setorId) ?? null })) },
      },
      select: { id: true },
    });
    await registrar(tx, acao.id, autor, "CRIACAO", descricaoHistorico ?? "Ação criada.");
    return acao;
  });
  return { ok: true, id };
}

const ROTULOS_CAMPO: Record<string, string> = {
  oque: "O quê",
  porque: "Por quê",
  como: "Como",
  responsavel: "Responsável",
  cargoResponsavel: "Cargo",
  inicio: "Início",
  prazo: "Prazo",
  reavaliarEm: "Reavaliar em",
  custoCentavos: "Custo",
  custoObservacao: "Observação do custo",
  dimensaoId: "Fator",
};

function valorLegivel(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v instanceof Date) return formatarDia(v);
  if (campo === "custoCentavos") return formatarReais(v as number);
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

type ResultadoEdicao = { ok: true } | { ok: false; erro: string };

const CONFLITO = "Esta ação foi alterada por outra pessoa enquanto você editava. Recarregue a página e refaça a alteração.";

/** Trava otimista: só grava se a versão (atualizadoEm) for a que o formulário leu. */
async function comVersao(
  id: string,
  workspaceId: string,
  versao: string,
  fazer: (tx: Prisma.TransactionClient, atual: NonNullable<Awaited<ReturnType<typeof db.acaoPlano.findFirst>>>) => Promise<void>,
): Promise<ResultadoEdicao> {
  const versaoData = new Date(versao);
  if (Number.isNaN(versaoData.getTime())) return { ok: false, erro: CONFLITO };
  try {
    await db.$transaction(async (tx) => {
      const atual = await tx.acaoPlano.findFirst({ where: { id, workspaceId } });
      if (!atual) throw new Error("NAO_ENCONTRADA");
      if (atual.atualizadoEm.getTime() !== versaoData.getTime()) throw new Error("CONFLITO");
      await fazer(tx, atual);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NAO_ENCONTRADA") return { ok: false, erro: "Ação não encontrada." };
    if (e instanceof Error && e.message === "CONFLITO") return { ok: false, erro: CONFLITO };
    if (e instanceof Error && e.message.startsWith("REGRA:")) return { ok: false, erro: e.message.slice(6) };
    throw e;
  }
  return { ok: true };
}

export async function atualizarAcao(id: string, workspaceId: string, versao: string, dados: DadosAcao, autor: Autor) {
  const erro = await validarVinculos(workspaceId, dados);
  if (erro) return { ok: false as const, erro };
  const { setorIds, ...campos } = dados;
  return comVersao(id, workspaceId, versao, async (tx, atual) => {
    const mudancas: string[] = [];
    for (const [campo, novo] of Object.entries(campos)) {
      const antigo = (atual as Record<string, unknown>)[campo];
      const igual =
        antigo instanceof Date || novo instanceof Date
          ? dataIso(antigo as Date | null) === dataIso(novo as Date | null)
          : (antigo ?? null) === (novo ?? null);
      if (!igual) mudancas.push(`${ROTULOS_CAMPO[campo] ?? campo}: ${valorLegivel(campo, antigo)} → ${valorLegivel(campo, novo)}`);
    }
    const setoresAtuais = await tx.acaoPlanoSetor.findMany({ where: { acaoId: id }, select: { setorId: true } });
    const atuais = new Set(setoresAtuais.map((s) => s.setorId));
    const remover = [...atuais].filter((s) => !setorIds.includes(s));
    const incluir = setorIds.filter((s) => !atuais.has(s));
    if (remover.length) await tx.acaoPlanoSetor.deleteMany({ where: { acaoId: id, setorId: { in: remover } } });
    if (incluir.length) await tx.acaoPlanoSetor.createMany({ data: incluir.map((setorId) => ({ acaoId: id, setorId })) });
    if (remover.length || incluir.length) mudancas.push(`Setores: +${incluir.length} / −${remover.length}`);
    await tx.acaoPlano.update({ where: { id }, data: campos });
    if (mudancas.length) await registrar(tx, id, autor, "EDICAO", mudancas.join(" · "));
  });
}

// ── PDCA ─────────────────────────────────────────────────────────────

/** Transições permitidas — evita, por exemplo, concluir sem verificar a eficácia. */
export const TRANSICOES: Record<Fase, Fase[]> = {
  PLANEJAR: ["EXECUTAR", "CANCELADA"],
  EXECUTAR: ["VERIFICAR", "PLANEJAR", "CANCELADA"],
  VERIFICAR: ["EXECUTAR"], // concluir só pela verificação de eficácia
  CONCLUIDA: ["VERIFICAR"], // reabrir a verificação
  CANCELADA: ["PLANEJAR"], // reativar
};

export async function mudarFase(id: string, workspaceId: string, versao: string, nova: Fase, autor: Autor) {
  return comVersao(id, workspaceId, versao, async (tx, atual) => {
    const de = atual.fase as Fase;
    if (!TRANSICOES[de].includes(nova)) throw new Error(`REGRA:Não é possível passar de ${FASES[de].rotulo} para ${FASES[nova].rotulo}.`);
    if (nova === "EXECUTAR" && de === "PLANEJAR") {
      const setores = await tx.acaoPlanoSetor.count({ where: { acaoId: id } });
      const faltam = [
        !atual.responsavel && "responsável (quem)",
        !atual.prazo && "prazo (quando)",
        setores === 0 && "setor (onde)",
      ].filter(Boolean);
      if (faltam.length) throw new Error(`REGRA:Para iniciar a execução, preencha: ${faltam.join(", ")}.`);
    }
    const dados: Prisma.AcaoPlanoUpdateInput = { fase: nova };
    if (nova === "VERIFICAR") dados.percentual = 100;
    if (nova === "VERIFICAR" && de === "CONCLUIDA") {
      dados.eficacia = null;
      dados.verificadaEm = null;
    }
    await tx.acaoPlano.update({ where: { id }, data: dados });
    await registrar(tx, id, autor, "FASE", `${FASES[de].rotulo} → ${FASES[nova].rotulo}`);
  });
}

export async function atualizarAndamento(
  id: string,
  workspaceId: string,
  versao: string,
  percentual: number,
  nota: string,
  autor: Autor,
) {
  if (!Number.isInteger(percentual) || percentual < 0 || percentual > 100) return { ok: false as const, erro: "Percentual de 0 a 100." };
  if (nota.length > LIMITES.nota) return { ok: false as const, erro: `Anotação com no máximo ${LIMITES.nota} caracteres.` };
  return comVersao(id, workspaceId, versao, async (tx, atual) => {
    if (atual.fase !== "EXECUTAR") throw new Error("REGRA:O andamento é registrado durante a execução.");
    await tx.acaoPlano.update({ where: { id }, data: { percentual } });
    const partes = [atual.percentual !== percentual ? `Andamento: ${atual.percentual}% → ${percentual}%` : null, nota || null].filter(Boolean);
    if (partes.length) await registrar(tx, id, autor, "ANDAMENTO", partes.join(" · "));
  });
}

/**
 * C → A: registra a eficácia. Eficaz conclui (padronizar). Parcial ou
 * ineficaz conclui esta ação e, se pedido, abre uma ação corretiva ligada,
 * reiniciando o ciclo.
 */
export async function verificarAcao(
  id: string,
  workspaceId: string,
  versao: string,
  v: { eficacia: Eficacia; verificacao: string; criarCorretiva: boolean },
  autor: Autor,
): Promise<{ ok: true; corretivaId: string | null } | { ok: false; erro: string }> {
  if (!(v.eficacia in EFICACIAS)) return { ok: false, erro: "Escolha a eficácia." };
  if (v.verificacao.length > LIMITES.textoLongo) return { ok: false, erro: "Texto da verificação muito longo." };
  if (v.eficacia !== "EFICAZ" && v.criarCorretiva === false && v.verificacao.length < 10) {
    return { ok: false, erro: "Sem ação corretiva, explique na verificação por que encerrar a ação." };
  }
  const r = await comVersao(id, workspaceId, versao, async (tx, atual) => {
    if (atual.fase !== "VERIFICAR") throw new Error("REGRA:A verificação de eficácia é feita na fase Verificar.");
    await tx.acaoPlano.update({
      where: { id },
      data: { fase: "CONCLUIDA", eficacia: v.eficacia, verificacao: v.verificacao || null, verificadaEm: new Date() },
    });
    await registrar(
      tx,
      id,
      autor,
      "VERIFICACAO",
      `Eficácia: ${EFICACIAS[v.eficacia].rotulo}${v.verificacao ? ` · ${v.verificacao}` : ""}`,
    );
  });
  if (!r.ok) return r;
  if (v.eficacia === "EFICAZ" || !v.criarCorretiva) return { ok: true, corretivaId: null };

  const snapshot = await obterAcao(id, workspaceId);
  if (!snapshot) return { ok: true, corretivaId: null };
  const regras = await carregarRegrasPrazo();
  const hoje = diaDe(new Date());
  const prio = (snapshot.prioridade as Prioridade | null) ?? null;
  const prazos = prio ? calcularPrazos(prio, hoje, regras) : null;
  const nova = await criarAcao(
    workspaceId,
    {
      oque: `Ação corretiva de #${snapshot.numero}: ${snapshot.oque}`.slice(0, LIMITES.oque),
      porque: `Verificação de #${snapshot.numero}: ${EFICACIAS[v.eficacia].rotulo.toLowerCase()}.${v.verificacao ? ` ${v.verificacao}` : ""}`.slice(0, LIMITES.textoLongo),
      como: null,
      responsavel: snapshot.responsavel,
      cargoResponsavel: snapshot.cargoResponsavel,
      inicio: hoje,
      prazo: prazos?.implantacao ?? prazos?.plano ?? null,
      reavaliarEm: prazos?.reavaliacao ?? null,
      custoCentavos: null,
      custoObservacao: null,
      dimensaoId: snapshot.dimensaoId,
      setorIds: snapshot.setores.map((s) => s.setorId),
    },
    autor,
    {
      acaoOrigemId: snapshot.id,
      prioridade: snapshot.prioridade,
      questaoEixo2Id: snapshot.questaoEixo2Id,
      indiceBase: new Map(snapshot.setores.map((s) => [s.setorId, s.indiceBase])),
      descricaoHistorico: `Ação corretiva aberta pela verificação de #${snapshot.numero}.`,
    },
  );
  return nova.ok ? { ok: true, corretivaId: nova.id } : nova;
}

// ── Geração a partir do Eixo 2 ───────────────────────────────────────

const ORDEM_PRIORIDADE: Prioridade[] = ["ALTA", "MEDIA", "BAIXA"];

/**
 * Cada plano escrito no Eixo 2 vira uma ação (agrupando questão + texto,
 * com vários setores). Idempotente: a mesma questão + texto já existente
 * (em qualquer fase — inclusive cancelada, para não ressuscitar o que o
 * gestor cancelou) não é recriada; só ganha setores novos se ainda aberta.
 * Prioridade e prazos vêm da FMEA do painel com esta avaliação.
 */
export async function gerarDoEixo2(workspaceId: string, avaliacaoId: string, autor: Autor) {
  const avaliacao = await db.avaliacaoEixo2.findFirst({ where: { id: avaliacaoId, workspaceId }, select: { id: true, nome: true } });
  if (!avaliacao) return { ok: false as const, erro: "Avaliação não encontrada." };

  const respostas = await db.respostaEixo2.findMany({
    where: { avaliacaoId, planoAcao: { not: null } },
    select: {
      questaoId: true,
      setorId: true,
      planoAcao: true,
      questao: { select: { perguntaEixo1: { select: { situacaoInvestigada: true, fatorRisco: { select: { dimensaoId: true } } } } } },
    },
  });
  const grupos = agruparPlanosEixo2(respostas.map((r) => ({ questaoId: r.questaoId, setorId: r.setorId, planoAcao: r.planoAcao ?? "" })));
  if (grupos.length === 0) return { ok: true as const, criadas: 0, atualizadas: 0 };

  const infoQuestao = new Map(
    respostas.map((r) => [
      r.questaoId,
      { dimensaoId: r.questao.perguntaEixo1.fatorRisco.dimensaoId, situacao: r.questao.perguntaEixo1.situacaoInvestigada },
    ]),
  );
  const painel = await calcularPainelFrprt(workspaceId, { avaliacaoId }, {});
  const regras = await carregarRegrasPrazo();
  const hoje = diaDe(new Date());

  const existentes = await db.acaoPlano.findMany({
    where: { workspaceId, questaoEixo2Id: { in: [...new Set(grupos.map((g) => g.questaoId))] } },
    select: { id: true, questaoEixo2Id: true, textoOrigem: true, fase: true, setores: { select: { setorId: true } } },
  });

  let criadas = 0;
  let atualizadas = 0;
  for (const g of grupos) {
    const info = infoQuestao.get(g.questaoId)!;
    const indices = new Map<string, number | null>();
    const prioridades: Prioridade[] = [];
    for (const setorId of g.setores) {
      const cel = painel?.linhas.find((l) => l.setorId === setorId)?.celulas.find((c) => c.fatorId === info.dimensaoId);
      indices.set(setorId, cel?.final ?? null);
      if (cel?.fmea && cel.conclusao !== "SEM_RISCO") prioridades.push(cel.fmea.prioridade);
    }
    const prioridade = ORDEM_PRIORIDADE.find((p) => prioridades.includes(p)) ?? null;

    const existente = existentes.find(
      (e) => e.questaoEixo2Id === g.questaoId && normalizarTexto(e.textoOrigem ?? "") === normalizarTexto(g.texto),
    );
    if (existente) {
      const aberta = existente.fase !== "CANCELADA" && existente.fase !== "CONCLUIDA";
      const novos = g.setores.filter((s) => !existente.setores.some((x) => x.setorId === s));
      if (aberta && novos.length) {
        await db.$transaction(async (tx) => {
          await tx.acaoPlanoSetor.createMany({
            data: novos.map((setorId) => ({ acaoId: existente.id, setorId, indiceBase: indices.get(setorId) ?? null })),
            skipDuplicates: true,
          });
          await tx.acaoPlano.update({ where: { id: existente.id }, data: { origemAvaliacaoId: avaliacao.id } });
          await registrar(tx, existente.id, autor, "GERACAO", `${novos.length} setor(es) acrescentado(s) pela avaliação "${avaliacao.nome}".`);
        });
        atualizadas++;
      }
      continue;
    }

    const prazos = prioridade ? calcularPrazos(prioridade, hoje, regras) : null;
    const r = await criarAcao(
      workspaceId,
      {
        oque: g.texto.slice(0, LIMITES.oque),
        porque: null,
        como: null,
        responsavel: null,
        cargoResponsavel: null,
        inicio: hoje,
        prazo: prazos ? (prazos.implantacao ?? prazos.plano) : null,
        reavaliarEm: prazos
          ? prazos.reavaliacao
          : calcularPrazos("BAIXA", hoje, regras).reavaliacao,
        custoCentavos: null,
        custoObservacao: null,
        dimensaoId: info.dimensaoId,
        setorIds: g.setores,
      },
      autor,
      {
        questaoEixo2Id: g.questaoId,
        textoOrigem: g.texto,
        origemAvaliacaoId: avaliacao.id,
        prioridade,
        indiceBase: indices,
        descricaoHistorico: `Gerada a partir do plano de ação do Eixo 2 (avaliação "${avaliacao.nome}").${
          prioridade ? ` Prioridade FMEA ${PRIORIDADES[prioridade].rotulo}.` : ""
        }`,
      },
    );
    if (r.ok) criadas++;
  }
  return { ok: true as const, criadas, atualizadas };
}

// ── Leituras para as telas ───────────────────────────────────────────

/**
 * Situações do PGR (setor × situação) sem nenhuma ação ativa cobrindo. O
 * painel já calcula quem cobre cada uma: ação gerada da própria questão do
 * Eixo 2, ou ação manual (sem questão) do mesmo fator, no mesmo setor.
 */
export function pendenciasDoPgr(painel: PainelFrprt) {
  return painel.fmea.pgr.filter((i) => i.acoes.length === 0);
}

/**
 * Questão do Eixo 2 de origem de uma ação manual vinda do PGR — só vale se
 * for da versão ativa e do mesmo fator escolhido no formulário (a pessoa
 * pode ter trocado o fator antes de salvar).
 */
export async function questaoDaSituacao(questaoEixo2Id: string, dimensaoId: string | null): Promise<string | null> {
  if (!questaoEixo2Id || !dimensaoId) return null;
  const q = await db.questaoEixo2.findFirst({
    where: {
      id: questaoEixo2Id,
      perguntaEixo1: { fatorRisco: { dimensaoId, dimensao: { bloco: { questionario: { ativo: true } } } } },
    },
    select: { id: true },
  });
  return q?.id ?? null;
}

/** Antes (índice quando a ação nasceu) × depois (painel atual), por setor. */
export function antesDepois(acao: AcaoCompleta, painel: PainelFrprt | null) {
  return acao.setores.map((s) => {
    const linha = painel?.linhas.find((l) => l.setorId === s.setorId);
    const cel = acao.dimensaoId ? linha?.celulas.find((c) => c.fatorId === acao.dimensaoId) : undefined;
    const depois = cel?.final ?? null;
    return {
      setor: s.setor.nome,
      antes: s.indiceBase,
      depois,
      suprimido: Boolean(linha?.suprimido),
      variacao: s.indiceBase !== null && depois !== null ? depois - s.indiceBase : null,
    };
  });
}

export { hojeIso };
