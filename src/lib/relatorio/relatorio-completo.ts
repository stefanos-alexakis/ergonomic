import { db } from "@/lib/db";
import { calcularPainelFrprt, type PainelFrprt } from "@/lib/painel-frprt";
import { calcularResultado } from "@/lib/avaliacao-eixo2";
import { calcularPainelEixo3 } from "@/lib/levantamento-eixo3";
import { listarAcoes, type AcaoCompleta } from "@/lib/plano-acao";
import { consultoresPorIds, type ConsultorAssinante } from "@/lib/consultores";
import { lerTexto } from "@/lib/textos-relatorio";
import { carregarParametrosMetodologia } from "@/lib/relatorio/parametros";
import type { ParametrosMetodologia } from "@/lib/relatorio/metodologia";
import { apagarRelatorioPdf, logoParaPdf, salvarRelatorioPdf } from "@/lib/upload";
import { Prisma } from "@prisma/client";
import { semCrlf } from "@/lib/plano-acao-util";
import { gerarRelatorioCompletoPdf } from "@/lib/relatorio/relatorio-completo-pdf";

/**
 * Relatório completo (pedido do cliente, out/2026): reúne tudo o que o
 * documento precisa a partir do rascunho da empresa. Sem filtros de
 * setor/departamento — o relatório é sempre da empresa inteira.
 */

export type Rascunho = {
  pesquisaId: string | null;
  avaliacaoId: string | null;
  levantamentoId: string | null;
  conclusao: string | null;
  consultorIds: string[];
};

export const LIMITE_CONCLUSAO = 30_000;

export async function carregarRascunho(workspaceId: string): Promise<Rascunho> {
  const r = await db.relatorioRascunho.findUnique({ where: { workspaceId } });
  return {
    pesquisaId: r?.pesquisaId ?? null,
    avaliacaoId: r?.avaliacaoId ?? null,
    levantamentoId: r?.levantamentoId ?? null,
    conclusao: r?.conclusao ?? null,
    consultorIds: r?.consultorIds ?? [],
  };
}

export type ResumoEixo2 = {
  nome: string;
  setores: { id: string; nome: string; completo: boolean }[];
  planos: { setor: string; dimensao: string; questao: string; plano: string }[];
};

export type ResumoEixo3 = Awaited<ReturnType<typeof calcularPainelEixo3>>;

export type DadosRelatorio = {
  empresa: string;
  logo: { buffer: Buffer; formato: "png" | "jpeg" } | null;
  logoWebp: boolean;
  emissao: Date;
  versao: number | null; // null = pré-visualização
  painel: PainelFrprt;
  eixo2: ResumoEixo2 | null;
  eixo3: ResumoEixo3 | null;
  acoes: AcaoCompleta[];
  metodologia: ParametrosMetodologia;
  legislacao: string | null;
  conclusao: string | null;
  consultores: ConsultorAssinante[];
};

export async function montarDadosRelatorio(
  workspace: { id: string; nome: string; logoUrl: string | null },
  rascunho: Rascunho,
  versao: number | null,
): Promise<DadosRelatorio | null> {
  // "nenhum" = fonte não considerada; vazio = mais recente (mesma regra do painel).
  const painel = await calcularPainelFrprt(
    workspace.id,
    {
      pesquisaId: rascunho.pesquisaId ?? undefined,
      avaliacaoId: rascunho.avaliacaoId ?? undefined,
      levantamentoId: rascunho.levantamentoId ?? undefined,
    },
    {},
  );
  if (!painel) return null;
  const { avaliacao, levantamento, questionarioId } = painel.opcoes;

  const [eixo2, eixo3, acoes, metodologia, legislacao, consultores, logo] = await Promise.all([
    avaliacao
      ? (async () => {
          const setores = await db.avaliacaoEixo2Setor.findMany({
            where: { avaliacaoId: avaliacao.id },
            select: { setor: { select: { id: true, nome: true } } },
          });
          const r = await calcularResultado(avaliacao.id, questionarioId, setores.map((s) => s.setor));
          return {
            nome: avaliacao.nome,
            setores: r.linhas.map((l) => ({ ...l.setor, completo: l.completo })),
            planos: r.planos.map((p) => ({ setor: p.setor, dimensao: p.dimensao, questao: p.questao, plano: p.plano })),
          };
        })()
      : null,
    levantamento ? calcularPainelEixo3(levantamento.id, workspace.id) : null,
    listarAcoes(workspace.id).then((l) => l.filter((a) => a.fase !== "CANCELADA")),
    carregarParametrosMetodologia(painel.limite),
    lerTexto("LEGISLACAO"),
    consultoresPorIds(rascunho.consultorIds),
    logoParaPdf(workspace.logoUrl),
  ]);

  return {
    empresa: workspace.nome,
    logo,
    logoWebp: Boolean(workspace.logoUrl?.endsWith(".webp")),
    emissao: painel.fmea.emitidoEm,
    versao,
    painel,
    eixo2,
    eixo3,
    acoes,
    metodologia,
    legislacao,
    conclusao: rascunho.conclusao?.trim() ? rascunho.conclusao : null,
    consultores,
  };
}

// ── Rascunho e emissão ───────────────────────────────────────────────


/**
 * Lê o formulário do rascunho. Fonte: id da lista da empresa, "nenhum"
 * (não considerar) ou vazio (mais recente). Ids de fora da empresa viram
 * "mais recente" — nunca uma fonte de outra empresa.
 */
export async function lerRascunho(
  workspaceId: string,
  fd: FormData,
): Promise<{ ok: true; rascunho: Rascunho } | { ok: false; erro: string }> {
  const conclusao = semCrlf(String(fd.get("conclusao") ?? ""));
  if (conclusao.length > LIMITE_CONCLUSAO) {
    return { ok: false, erro: `Conclusão muito longa (máximo ${LIMITE_CONCLUSAO.toLocaleString("pt-BR")} caracteres).` };
  }
  const fonte = async (campo: string, existe: (id: string) => Promise<boolean>) => {
    const v = String(fd.get(campo) ?? "");
    if (v === "nenhum") return "nenhum";
    return v && (await existe(v)) ? v : null;
  };
  const [pesquisaId, avaliacaoId, levantamentoId] = await Promise.all([
    fonte("pesquisaId", async (id) => (await db.pesquisa.count({ where: { id, workspaceId } })) > 0),
    fonte("avaliacaoId", async (id) => (await db.avaliacaoEixo2.count({ where: { id, workspaceId } })) > 0),
    fonte("levantamentoId", async (id) => (await db.levantamentoEixo3.count({ where: { id, workspaceId, status: "PUBLICADO" } })) > 0),
  ]);
  const pedidos = fd.getAll("consultorIds").map(String);
  const existentes = new Set(
    (await db.consultor.findMany({ where: { id: { in: pedidos } }, select: { id: true } })).map((c) => c.id),
  );
  return {
    ok: true,
    rascunho: {
      pesquisaId,
      avaliacaoId,
      levantamentoId,
      conclusao: conclusao || null,
      consultorIds: [...new Set(pedidos.filter((id) => existentes.has(id)))],
    },
  };
}

export async function salvarRascunho(workspaceId: string, r: Rascunho): Promise<void> {
  await db.relatorioRascunho.upsert({ where: { workspaceId }, create: { workspaceId, ...r }, update: r });
}

export function listarEmitidos(workspaceId: string) {
  return db.relatorioEmitido.findMany({
    where: { workspaceId },
    orderBy: { versao: "desc" },
    select: { id: true, versao: true, emitidoEm: true, emitidoPorNome: true, tamanhoBytes: true, fontes: true, consultores: true },
  });
}

export type FontesEmitidas = { pesquisa: string | null; avaliacao: string | null; levantamento: string | null };

/**
 * Emite uma nova versão: gera o PDF com o número da versão impresso,
 * grava o arquivo e registra. Duas emissões ao mesmo tempo disputam o
 * mesmo número: quem perde apaga o próprio arquivo e tenta o seguinte.
 */
export async function emitirRelatorio(
  workspace: { id: string; nome: string; logoUrl: string | null },
  autor: { userId: string; nome: string },
): Promise<{ ok: true; versao: number } | { ok: false; erro: string }> {
  const rascunho = await carregarRascunho(workspace.id);
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const ultima = await db.relatorioEmitido.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { versao: "desc" },
      select: { versao: true },
    });
    const versao = (ultima?.versao ?? 0) + 1;
    const dados = await montarDadosRelatorio(workspace, rascunho, versao);
    if (!dados) return { ok: false, erro: "Nenhum questionário ativo." };
    const pdf = await gerarRelatorioCompletoPdf(dados);
    const arquivo = await salvarRelatorioPdf(pdf);
    const fontes: FontesEmitidas = {
      pesquisa: dados.painel.opcoes.pesquisa?.nome ?? null,
      avaliacao: dados.painel.opcoes.avaliacao?.nome ?? null,
      levantamento: dados.painel.opcoes.levantamento?.nome ?? null,
    };
    try {
      await db.relatorioEmitido.create({
        data: {
          workspaceId: workspace.id,
          versao,
          emitidoEm: dados.emissao,
          emitidoPorId: autor.userId,
          emitidoPorNome: autor.nome,
          arquivo,
          tamanhoBytes: pdf.length,
          fontes,
          consultores: dados.consultores,
          conclusao: dados.conclusao,
        },
      });
      return { ok: true, versao };
    } catch (e) {
      await apagarRelatorioPdf(arquivo);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return { ok: false, erro: "Não foi possível numerar a versão. Tente de novo." };
}
