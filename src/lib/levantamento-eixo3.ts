import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { adicionarItemCatalogo } from "@/lib/estrutura";
import { parsePlanilhaOcorrencias, type ProblemaPlanilha } from "@/lib/planilha-eixo3";
import { calcularEixo3Setor, montarMatrizPorFator, type MatrizPorFator, type Relacao } from "@/lib/eixo3";

/**
 * Levantamento do Eixo 3: a empresa publica a planilha de ocorrências CID-F
 * (dado de saúde — sensível pela LGPD). Toda função recebe o `workspaceId`
 * já resolvido pela sessão e filtra por ele; nenhum identificador de
 * trabalhador é aceito ou guardado.
 */

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

function chaveNome(nome: string) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function listarLevantamentos(workspaceId: string) {
  return db.levantamentoEixo3.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { ocorrencias: { where: { ignorada: false } } } } },
  });
}

export async function resolverLevantamento(id: string, workspaceId: string) {
  return db.levantamentoEixo3.findFirst({ where: { id, workspaceId } });
}

function lerPeriodo(inicio: string, fim: string): { inicio: Date; fim: Date } | { erro: string } {
  const i = new Date(`${inicio}T00:00:00Z`);
  const f = new Date(`${fim}T00:00:00Z`);
  if (Number.isNaN(i.getTime()) || Number.isNaN(f.getTime())) return { erro: "Informe o período analisado." };
  if (f < i) return { erro: "O fim do período não pode ser antes do início." };
  return { inicio: i, fim: f };
}

export async function criarLevantamento(
  workspaceId: string,
  input: { nome: string; periodoInicio: string; periodoFim: string; responsavel: string; cargoResponsavel: string },
): Promise<Resultado<{ id: string }>> {
  const nome = input.nome.trim();
  if (nome.length < 2) return { ok: false, erro: "Dê um nome ao levantamento (ex.: Atestados 2025)." };
  const periodo = lerPeriodo(input.periodoInicio, input.periodoFim);
  if ("erro" in periodo) return { ok: false, erro: periodo.erro };
  const l = await db.levantamentoEixo3.create({
    data: {
      workspaceId,
      nome: nome.slice(0, 120),
      periodoInicio: periodo.inicio,
      periodoFim: periodo.fim,
      responsavel: input.responsavel.trim().slice(0, 120) || null,
      cargoResponsavel: input.cargoResponsavel.trim().slice(0, 120) || null,
    },
  });
  return { ok: true, id: l.id };
}

export async function atualizarIdentificacao(
  id: string,
  workspaceId: string,
  input: { nome: string; periodoInicio: string; periodoFim: string; responsavel: string; cargoResponsavel: string },
): Promise<Resultado> {
  const l = await resolverLevantamento(id, workspaceId);
  if (!l) return { ok: false, erro: "Levantamento não encontrado." };
  if (l.status === "PUBLICADO") return { ok: false, erro: "Reabra o levantamento para editar." };
  const nome = input.nome.trim();
  if (nome.length < 2) return { ok: false, erro: "Dê um nome ao levantamento." };
  const periodo = lerPeriodo(input.periodoInicio, input.periodoFim);
  if ("erro" in periodo) return { ok: false, erro: periodo.erro };
  await db.levantamentoEixo3.update({
    where: { id: l.id },
    data: {
      nome: nome.slice(0, 120),
      periodoInicio: periodo.inicio,
      periodoFim: periodo.fim,
      responsavel: input.responsavel.trim().slice(0, 120) || null,
      cargoResponsavel: input.cargoResponsavel.trim().slice(0, 120) || null,
    },
  });
  return { ok: true };
}

export type ResultadoImportacao =
  | { ok: true; total: number; avisos: ProblemaPlanilha[]; setoresPendentes: number }
  | { ok: false; erro: string; erros?: ProblemaPlanilha[]; avisos?: ProblemaPlanilha[] };

/**
 * Lê a planilha e, só se não houver nenhum erro, substitui as ocorrências do
 * rascunho. Setores com o mesmo nome do cadastro (ignorando caixa e acento)
 * são associados na hora; os outros ficam pendentes para o usuário decidir.
 */
export async function importarPlanilha(
  id: string,
  workspaceId: string,
  arquivo: { nome: string; buffer: Buffer },
): Promise<ResultadoImportacao> {
  const l = await resolverLevantamento(id, workspaceId);
  if (!l) return { ok: false, erro: "Levantamento não encontrado." };
  if (l.status === "PUBLICADO") return { ok: false, erro: "Reabra o levantamento para trocar a planilha." };

  const parsed = await parsePlanilhaOcorrencias(arquivo.buffer);
  if (parsed.erros.length > 0) {
    return {
      ok: false,
      erro: "A planilha tem erros — corrija e envie de novo. Nada foi importado.",
      erros: parsed.erros.slice(0, 200),
      avisos: parsed.avisos.slice(0, 200),
    };
  }

  const setores = await db.setorOrg.findMany({ where: { workspaceId }, select: { id: true, nome: true } });
  const porNome = new Map(setores.map((s) => [chaveNome(s.nome), s.id]));

  await db.$transaction([
    db.ocorrenciaEixo3.deleteMany({ where: { levantamentoId: l.id } }),
    db.ocorrenciaEixo3.createMany({
      data: parsed.linhas.map((o) => ({
        levantamentoId: l.id,
        setorId: porNome.get(chaveNome(o.setor)) ?? null,
        setorOriginal: o.setor,
        linhaPlanilha: o.linha,
        cid: o.cid,
        cidDescricao: o.cidDescricao,
        dataInicio: o.dataInicio,
        diasAfastados: o.diasAfastados,
        relacao: o.relacao,
        justificativa: o.justificativa,
      })),
    }),
    db.levantamentoEixo3.update({
      where: { id: l.id },
      data: {
        arquivoNome: arquivo.nome.slice(0, 200),
        arquivoHash: createHash("sha256").update(arquivo.buffer).digest("hex"),
      },
    }),
  ]);

  const pendentes = new Set(parsed.linhas.filter((o) => !porNome.has(chaveNome(o.setor))).map((o) => chaveNome(o.setor)));
  return { ok: true, total: parsed.linhas.length, avisos: parsed.avisos.slice(0, 200), setoresPendentes: pendentes.size };
}

/** Nomes de setor da planilha, com a associação atual e a quantidade de linhas. */
export async function setoresDaPlanilha(levantamentoId: string) {
  const grupos = await db.ocorrenciaEixo3.groupBy({
    by: ["setorOriginal", "setorId", "ignorada"],
    where: { levantamentoId },
    _count: { _all: true },
    orderBy: { setorOriginal: "asc" },
  });
  return grupos.map((g) => ({
    setorOriginal: g.setorOriginal,
    setorId: g.setorId,
    ignorada: g.ignorada,
    linhas: g._count._all,
  }));
}

/** Associa um nome da planilha a um setor cadastrado, cria o setor ou ignora as linhas. */
export async function resolverSetor(
  id: string,
  workspaceId: string,
  setorOriginal: string,
  acao: { tipo: "associar"; setorId: string } | { tipo: "criar" } | { tipo: "ignorar" },
): Promise<Resultado> {
  const l = await resolverLevantamento(id, workspaceId);
  if (!l) return { ok: false, erro: "Levantamento não encontrado." };
  if (l.status === "PUBLICADO") return { ok: false, erro: "Reabra o levantamento para alterar." };

  let setorId: string | null = null;
  let ignorada = false;
  if (acao.tipo === "associar") {
    const setor = await db.setorOrg.findFirst({ where: { id: acao.setorId, workspaceId } });
    if (!setor) return { ok: false, erro: "Setor inválido para esta empresa." };
    setorId = setor.id;
  } else if (acao.tipo === "criar") {
    const nome = setorOriginal.trim();
    if (nome.length < 2 || nome.length > 120) return { ok: false, erro: "Nome de setor inválido." };
    setorId = (await adicionarItemCatalogo(workspaceId, "setor", nome)).id;
  } else {
    ignorada = true;
  }

  const r = await db.ocorrenciaEixo3.updateMany({
    where: { levantamentoId: l.id, setorOriginal },
    data: { setorId, ignorada },
  });
  return r.count > 0 ? { ok: true } : { ok: false, erro: "Setor da planilha não encontrado." };
}

export async function publicarLevantamento(
  id: string,
  workspaceId: string,
  userId: string,
  input: { declaracao: boolean; responsavel: string; cargoResponsavel: string },
): Promise<Resultado> {
  const l = await resolverLevantamento(id, workspaceId);
  if (!l) return { ok: false, erro: "Levantamento não encontrado." };
  if (l.status === "PUBLICADO") return { ok: true };
  if (!l.arquivoNome) return { ok: false, erro: "Envie a planilha de ocorrências antes de publicar." };
  if (!input.declaracao) return { ok: false, erro: "É preciso aceitar a declaração de veracidade para publicar." };
  const responsavel = input.responsavel.trim();
  if (responsavel.length < 2) return { ok: false, erro: "Informe o responsável pelo preenchimento (RH/DP)." };

  const pendentes = await db.ocorrenciaEixo3.count({ where: { levantamentoId: l.id, setorId: null, ignorada: false } });
  if (pendentes > 0) return { ok: false, erro: "Há setores da planilha sem associação — resolva antes de publicar." };

  const agora = new Date();
  await db.levantamentoEixo3.update({
    where: { id: l.id },
    data: {
      status: "PUBLICADO",
      publicadoEm: agora,
      declaracaoAceitaEm: agora,
      declaracaoAceitaPor: userId,
      responsavel: responsavel.slice(0, 120),
      cargoResponsavel: input.cargoResponsavel.trim().slice(0, 120) || null,
    },
  });
  return { ok: true };
}

export async function reabrirLevantamento(id: string, workspaceId: string): Promise<Resultado> {
  const r = await db.levantamentoEixo3.updateMany({
    where: { id, workspaceId },
    data: { status: "RASCUNHO", publicadoEm: null },
  });
  return r.count === 1 ? { ok: true } : { ok: false, erro: "Levantamento não encontrado." };
}

export async function excluirLevantamento(id: string, workspaceId: string): Promise<Resultado> {
  const r = await db.levantamentoEixo3.deleteMany({ where: { id, workspaceId } });
  return r.count === 1 ? { ok: true } : { ok: false, erro: "Levantamento não encontrado." };
}

// ── Matriz e painel ───────────────────────────────────────────────────────

export type FatorMatriz = { id: string; nome: string; ordem: number; cids: string[]; naoEspecifico: boolean };

/** Fatores (as 13 dimensões) do questionário, com a matriz Fatores × CID F. */
export async function carregarMatriz(questionarioId: string) {
  const situacoes = await db.matrizCidSituacao.findMany({
    where: { perguntaEixo1: { fatorRisco: { dimensao: { bloco: { questionarioId } } } } },
    include: {
      perguntaEixo1: {
        select: {
          ordemGlobal: true,
          situacaoInvestigada: true,
          vaiParaPgr: true,
          fatorRisco: {
            select: { nome: true, dimensao: { select: { id: true, nome: true, ordem: true, bloco: { select: { ordem: true } } } } },
          },
        },
      },
    },
  });
  situacoes.sort((a, b) => a.perguntaEixo1.ordemGlobal - b.perguntaEixo1.ordemGlobal);

  const fatores: { id: string; nome: string; fatorRisco: string }[] = [];
  for (const s of situacoes) {
    const d = s.perguntaEixo1.fatorRisco.dimensao;
    if (!fatores.some((f) => f.id === d.id)) fatores.push({ id: d.id, nome: d.nome, fatorRisco: s.perguntaEixo1.fatorRisco.nome });
  }

  const matriz: MatrizPorFator = montarMatrizPorFator(
    situacoes.map((s) => ({ fatorId: s.perguntaEixo1.fatorRisco.dimensao.id, cids: s.cids, naoEspecifico: s.naoEspecifico })),
  );

  return { fatores, matriz, situacoes };
}

export type OcorrenciaPainel = {
  id: string;
  setorId: string | null;
  setor: string;
  cid: string;
  cidDescricao: string | null;
  dataInicio: Date | null;
  diasAfastados: number | null;
  relacao: Relacao;
  justificativa: string | null;
  linhaPlanilha: number;
};

/** Painel do Eixo 3: indicadores por setor e fator de agravamento setor × fator. */
export async function calcularPainelEixo3(levantamentoId: string, workspaceId: string) {
  const questionario = await db.questionario.findFirst({ where: { ativo: true } });
  const { fatores, matriz } = questionario
    ? await carregarMatriz(questionario.id)
    : { fatores: [], matriz: new Map() as MatrizPorFator };

  const ocorrencias = await db.ocorrenciaEixo3.findMany({
    where: { levantamentoId, ignorada: false, levantamento: { workspaceId } },
    include: { setor: { select: { id: true, nome: true, numeroColaboradores: true } } },
    orderBy: [{ setorOriginal: "asc" }, { linhaPlanilha: "asc" }],
  });

  const porSetor = new Map<string, typeof ocorrencias>();
  for (const o of ocorrencias) {
    const chave = o.setorId ?? `sem:${o.setorOriginal}`;
    porSetor.set(chave, [...(porSetor.get(chave) ?? []), o]);
  }

  const setores = [...porSetor.entries()]
    .map(([chave, lista]) => {
      const setor = lista[0]!.setor;
      const r = calcularEixo3Setor(
        lista.map((o) => ({ cid: o.cid, relacao: o.relacao, diasAfastados: o.diasAfastados })),
        matriz,
      );
      const colaboradores = setor?.numeroColaboradores ?? null;
      return {
        chave,
        setorId: setor?.id ?? null,
        nome: setor?.nome ?? `${lista[0]!.setorOriginal} (setor removido)`,
        colaboradores,
        taxaPor100: colaboradores && colaboradores > 0 ? (r.ocorrencias / colaboradores) * 100 : null,
        ...r,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const porCategoria = new Map<string, number>();
  for (const o of ocorrencias) porCategoria.set(o.cid.slice(0, 3), (porCategoria.get(o.cid.slice(0, 3)) ?? 0) + 1);
  const cidsFrequentes = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]).map(([cid, total]) => ({ cid, total }));

  const lista: OcorrenciaPainel[] = ocorrencias.map((o) => ({
    id: o.id,
    setorId: o.setorId,
    setor: o.setor?.nome ?? o.setorOriginal,
    cid: o.cid,
    cidDescricao: o.cidDescricao,
    dataInicio: o.dataInicio,
    diasAfastados: o.diasAfastados,
    relacao: o.relacao,
    justificativa: o.justificativa,
    linhaPlanilha: o.linhaPlanilha,
  }));

  return { fatores, setores, cidsFrequentes, ocorrencias: lista };
}
