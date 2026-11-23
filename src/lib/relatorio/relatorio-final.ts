import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { calcularDistribuicao, positividade, type DistribuicaoPesquisa } from "@/lib/distribuicao-respostas";
import { semCrlf } from "@/lib/plano-acao-util";
import { apagarRelatorioPdf, salvarRelatorioPdf } from "@/lib/upload";
import { carregarRascunho, montarDadosRelatorio, type DadosRelatorio, type FontesEmitidas, type Rascunho } from "@/lib/relatorio/relatorio-completo";
import { carregarRelatorioEixo2, observacaoEixo2, resumoExecutivoEixo2, type RelatorioEixo2 } from "@/lib/relatorio/eixo2-relatorio";

/**
 * Relatório final no modelo da cliente (nov/2026). Usa as mesmas fontes e a
 * mesma conclusão do rascunho do relatório completo; acrescenta textos do
 * consultor (cruzamento analítico) e textos gerados pelo sistema que ele pode
 * reescrever (resumo e observação do Eixo 2, fontes internas). Campo nulo no
 * banco = usa o texto gerado na hora, que acompanha os dados.
 */

export const MODELO_FINAL = "FINAL";
export const LIMITE_TEXTO_FINAL = 30_000;

export type TextosFinal = {
  cruzamentoAnalitico: string | null;
  resumoEixo2: string | null;
  observacaoEixo2: string | null;
  fontesInternas: string | null;
};

const CAMPOS_TEXTO = ["cruzamentoAnalitico", "resumoEixo2", "observacaoEixo2", "fontesInternas"] as const;

/** Textos que o sistema gera (o consultor pode substituir). */
export type PadroesTextos = { resumoEixo2: string; observacaoEixo2: string; fontesInternas: string };

export async function carregarTextosFinal(workspaceId: string): Promise<TextosFinal> {
  const r = await db.relatorioRascunho.findUnique({ where: { workspaceId } });
  return {
    cruzamentoAnalitico: r?.cruzamentoAnalitico ?? null,
    resumoEixo2: r?.resumoEixo2 ?? null,
    observacaoEixo2: r?.observacaoEixo2 ?? null,
    fontesInternas: r?.fontesInternas ?? null,
  };
}

/**
 * Lê os textos do formulário. Texto igual ao gerado pelo sistema (ou vazio)
 * vira nulo: assim ele continua acompanhando os dados até alguém editar.
 */
export function lerTextosFinal(
  fd: FormData,
  padroes: PadroesTextos,
): { ok: true; textos: TextosFinal } | { ok: false; erro: string } {
  const textos = {} as TextosFinal;
  for (const campo of CAMPOS_TEXTO) {
    const v = semCrlf(String(fd.get(campo) ?? ""));
    if (v.length > LIMITE_TEXTO_FINAL) return { ok: false, erro: `Texto muito longo (máximo ${LIMITE_TEXTO_FINAL.toLocaleString("pt-BR")} caracteres).` };
    const padrao = campo === "cruzamentoAnalitico" ? null : padroes[campo];
    textos[campo] = v === "" || (padrao !== null && v === semCrlf(padrao)) ? null : v;
  }
  return { ok: true, textos };
}

export async function salvarTextosFinal(workspaceId: string, t: TextosFinal): Promise<void> {
  await db.relatorioRascunho.upsert({ where: { workspaceId }, create: { workspaceId, ...t }, update: t });
}

export type PositividadeSetor = { setor: string; fatores: { nome: string; percentual: number | null }[] };

export type DadosRelatorioFinal = DadosRelatorio & {
  eixo1: {
    todos: DistribuicaoPesquisa;
    porSetor: DistribuicaoPesquisa[];
    positividade: PositividadeSetor[];
  } | null;
  eixo2Relatorio: RelatorioEixo2 | null;
  textos: {
    cruzamentoAnalitico: string | null;
    resumoEixo2: string;
    observacaoEixo2: string;
    fontesInternas: string;
  };
  /** Padrões gerados pelo sistema (para a tela mostrar e permitir voltar a eles). */
  padroes: PadroesTextos;
};

const dataUtc = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

/** Fontes internas da avaliação, geradas a partir das fontes escolhidas (editáveis). */
export function fontesInternasPadrao(empresa: string, opcoes: DadosRelatorio["painel"]["opcoes"]): string {
  const nome = empresa.toLocaleUpperCase("pt-BR");
  const ano = new Date().getFullYear();
  const itens: string[] = [];
  if (opcoes.pesquisa) {
    itens.push(
      `- ${nome}. Questionário de percepção dos colaboradores sobre fatores de riscos psicossociais relacionados ao trabalho: Eixo 01 — ${opcoes.pesquisa.nome} (${dataUtc(opcoes.pesquisa.dataInicio)} a ${dataUtc(opcoes.pesquisa.dataFim)}). Documento interno. ${ano}.`,
    );
  }
  if (opcoes.avaliacao) {
    itens.push(
      `- ${nome}. Entrevistas com grupos focais e lideranças: validação dos fatores psicossociais e levantamento da organização do trabalho: Eixo 02 — ${opcoes.avaliacao.nome}. Registros internos. ${ano}.`,
    );
  }
  if (opcoes.levantamento) {
    itens.push(
      `- ${nome}. Levantamento de atestados médicos e códigos CID: Eixo 03 — ${opcoes.levantamento.nome} (${dataUtc(opcoes.levantamento.periodoInicio)} a ${dataUtc(opcoes.levantamento.periodoFim)}). Dados fornecidos pelo setor de Recursos Humanos. Documento interno confidencial. ${ano}.`,
    );
  }
  return itens.join("\n") || "- Nenhuma fonte interna considerada.";
}

export async function montarDadosRelatorioFinal(
  workspace: { id: string; nome: string; logoUrl: string | null },
  rascunho: Rascunho,
  textos: TextosFinal,
  versao: number | null,
): Promise<DadosRelatorioFinal | null> {
  const base = await montarDadosRelatorio(workspace, rascunho, versao);
  if (!base) return null;
  const { pesquisa, avaliacao, questionarioId } = base.painel.opcoes;

  const [eixo1, eixo2Relatorio] = await Promise.all([
    pesquisa
      ? (async () => {
          const todos = await calcularDistribuicao(pesquisa.id);
          if (!todos.suficiente) return null;
          const visiveis = todos.setores.filter((s) => !s.suprimido);
          const porSetor = await Promise.all(visiveis.map((s) => calcularDistribuicao(pesquisa.id, s.id)));
          const fatoresDe = (d: DistribuicaoPesquisa) => d.fatores.map((f) => ({ nome: f.nome, percentual: positividade(f) }));
          return {
            todos,
            porSetor,
            positividade: [
              { setor: "Todos os setores", fatores: fatoresDe(todos) },
              ...porSetor.map((d) => ({ setor: d.setorSelecionado!.nome, fatores: fatoresDe(d) })),
            ],
          };
        })()
      : null,
    avaliacao
      ? (async () => {
          const setores = await db.avaliacaoEixo2Setor.findMany({
            where: { avaliacaoId: avaliacao.id },
            select: { setor: { select: { id: true, nome: true } } },
            orderBy: { setor: { nome: "asc" } },
          });
          return carregarRelatorioEixo2(avaliacao, questionarioId, setores.map((s) => s.setor));
        })()
      : null,
  ]);

  const padroes = {
    resumoEixo2: eixo2Relatorio ? resumoExecutivoEixo2(eixo2Relatorio) : "- Nenhuma avaliação do Eixo 2 considerada.",
    observacaoEixo2: eixo2Relatorio ? observacaoEixo2(eixo2Relatorio) : "",
    fontesInternas: fontesInternasPadrao(workspace.nome, base.painel.opcoes),
  };

  return {
    ...base,
    eixo1,
    eixo2Relatorio,
    textos: {
      cruzamentoAnalitico: textos.cruzamentoAnalitico?.trim() ? textos.cruzamentoAnalitico : null,
      resumoEixo2: textos.resumoEixo2 ?? padroes.resumoEixo2,
      observacaoEixo2: textos.observacaoEixo2 ?? padroes.observacaoEixo2,
      fontesInternas: textos.fontesInternas ?? padroes.fontesInternas,
    },
    padroes,
  };
}

export function listarEmitidosFinal(workspaceId: string) {
  return db.relatorioEmitido.findMany({
    where: { workspaceId, modelo: MODELO_FINAL },
    orderBy: { versao: "desc" },
    select: { id: true, versao: true, emitidoEm: true, emitidoPorNome: true, tamanhoBytes: true, fontes: true },
  });
}

/**
 * Emite uma versão do relatório final. A numeração é a mesma sequência do
 * relatório completo (índice único por empresa — ver schema): disputa entre
 * duas emissões simultâneas é resolvida tentando o número seguinte.
 */
export async function emitirRelatorioFinal(
  workspace: { id: string; nome: string; logoUrl: string | null },
  autor: { userId: string; nome: string },
  gerarPdf: (d: DadosRelatorioFinal) => Promise<Buffer>,
): Promise<{ ok: true; versao: number } | { ok: false; erro: string }> {
  const [rascunho, textos] = await Promise.all([carregarRascunho(workspace.id), carregarTextosFinal(workspace.id)]);
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const ultima = await db.relatorioEmitido.findFirst({
      where: { workspaceId: workspace.id },
      orderBy: { versao: "desc" },
      select: { versao: true },
    });
    const versao = (ultima?.versao ?? 0) + 1;
    const dados = await montarDadosRelatorioFinal(workspace, rascunho, textos, versao);
    if (!dados) return { ok: false, erro: "Nenhum questionário ativo." };
    const pdf = await gerarPdf(dados);
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
          modelo: MODELO_FINAL,
          emitidoEm: dados.emissao,
          emitidoPorId: autor.userId,
          emitidoPorNome: autor.nome,
          arquivo,
          tamanhoBytes: pdf.length,
          fontes,
          consultores: [],
          responsaveis: dados.responsaveis,
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
