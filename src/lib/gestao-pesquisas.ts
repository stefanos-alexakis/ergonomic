import { db } from "@/lib/db";
import { resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import {
  DIAS_CARENCIA_EXCLUSAO,
  exclusaoDefinitivaLiberada,
  exclusaoLiberadaEm,
  validarNovoEncerramento,
} from "@/lib/vigencia-pesquisa";

/**
 * Gestão do ciclo de vida de uma pesquisa do Eixo 1: prorrogar, arquivar e
 * excluir. Toda função recebe o `workspaceId` já resolvido pela sessão e
 * confere que a pesquisa é dessa empresa — o id vindo da tela nunca basta.
 * Todas as regras são checadas aqui de novo, não só na interface.
 */

export type Resultado = { ok: true } | { ok: false; erro: string };

const NAO_ENCONTRADA = { ok: false, erro: "Pesquisa não encontrada." } as const;

/** O nome digitado confere com o da pesquisa (ignora espaços nas pontas e caixa). */
export function nomeConfere(digitado: string, nome: string): boolean {
  return digitado.trim().toLocaleLowerCase("pt-BR") === nome.trim().toLocaleLowerCase("pt-BR");
}

/**
 * "Iniciada" = algum código de PARTICIPANTE saiu de Disponível (iniciado,
 * concluído ou bloqueado) ou já tem resposta. Os códigos de teste não contam.
 */
export async function pesquisaIniciada(pesquisaId: string): Promise<boolean> {
  const usados = await db.codigoAcesso.count({
    where: {
      pesquisaId,
      tipo: "PARTICIPANTE",
      OR: [{ status: { in: ["INICIADO", "CONCLUIDO", "BLOQUEADO"] } }, { resposta: { isNot: null } }],
    },
  });
  return usados > 0;
}

/** Prorroga (ou ajusta) o encerramento. Pesquisa arquivada precisa ser desarquivada antes. */
export async function alterarEncerramento(pesquisaId: string, workspaceId: string, novoFim: Date): Promise<Resultado> {
  const p = await resolvePesquisaDoWorkspace(pesquisaId, workspaceId);
  if (!p) return NAO_ENCONTRADA;
  if (p.arquivadaEm) return { ok: false, erro: "Desarquive a pesquisa antes de alterar o encerramento." };
  const v = validarNovoEncerramento(p, novoFim, { iniciada: await pesquisaIniciada(p.id) });
  if (!v.ok) return v;
  await db.pesquisa.update({ where: { id: p.id }, data: { dataFim: novoFim } });
  return { ok: true };
}

export async function arquivarPesquisa(pesquisaId: string, workspaceId: string): Promise<Resultado> {
  const p = await resolvePesquisaDoWorkspace(pesquisaId, workspaceId);
  if (!p) return NAO_ENCONTRADA;
  if (!p.arquivadaEm) await db.pesquisa.update({ where: { id: p.id }, data: { arquivadaEm: new Date() } });
  return { ok: true };
}

export async function desarquivarPesquisa(pesquisaId: string, workspaceId: string): Promise<Resultado> {
  const p = await resolvePesquisaDoWorkspace(pesquisaId, workspaceId);
  if (!p) return NAO_ENCONTRADA;
  if (p.exclusaoSolicitadaEm) {
    return { ok: false, erro: "Há um pedido de exclusão em andamento. Cancele o pedido antes de desarquivar." };
  }
  await db.pesquisa.update({ where: { id: p.id }, data: { arquivadaEm: null } });
  return { ok: true };
}

/**
 * Apaga a pesquisa e tudo que depende dela, em ordem explícita (um único
 * DELETE em cascata já deu conflito de chave em Resposta_codigoAcessoId_fkey).
 * Os relatórios emitidos (PDF) são versões imutáveis e ficam; só o rascunho do
 * relatório deixa de apontar para a pesquisa.
 */
async function apagarPesquisa(pesquisaId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.respostaPrePesquisa.deleteMany({ where: { pesquisaId } });
    await tx.resposta.deleteMany({ where: { codigoAcesso: { pesquisaId } } });
    await tx.codigoAcesso.deleteMany({ where: { pesquisaId } });
    await tx.relatorioRascunho.updateMany({ where: { pesquisaId }, data: { pesquisaId: null } });
    await tx.pesquisa.delete({ where: { id: pesquisaId } });
  });
}

/** Exclusão direta: só vale para pesquisa que não foi iniciada. */
export async function excluirPesquisaNaoIniciada(pesquisaId: string, workspaceId: string): Promise<Resultado> {
  const p = await resolvePesquisaDoWorkspace(pesquisaId, workspaceId);
  if (!p) return NAO_ENCONTRADA;
  if (await pesquisaIniciada(p.id)) {
    return { ok: false, erro: "Esta pesquisa já foi iniciada: peça a exclusão com a confirmação por escrito." };
  }
  await apagarPesquisa(p.id);
  return { ok: true };
}

/** Pedido de exclusão de pesquisa iniciada: arquiva agora e só libera a exclusão em 30 dias. */
export async function solicitarExclusao(
  pesquisaId: string,
  workspaceId: string,
  nomeDigitado: string,
): Promise<Resultado> {
  const p = await resolvePesquisaDoWorkspace(pesquisaId, workspaceId);
  if (!p) return NAO_ENCONTRADA;
  if (!nomeConfere(nomeDigitado, p.nome)) {
    return { ok: false, erro: "Digite o nome da pesquisa exatamente como aparece para confirmar." };
  }
  if (!(await pesquisaIniciada(p.id))) {
    return { ok: false, erro: "Esta pesquisa não foi iniciada: ela pode ser excluída direto, sem o prazo de 30 dias." };
  }
  if (p.exclusaoSolicitadaEm) return { ok: true }; // já pedido: não reinicia a contagem
  const agora = new Date();
  await db.pesquisa.update({
    where: { id: p.id },
    data: { exclusaoSolicitadaEm: agora, arquivadaEm: p.arquivadaEm ?? agora },
  });
  return { ok: true };
}

export async function cancelarExclusao(pesquisaId: string, workspaceId: string): Promise<Resultado> {
  const p = await resolvePesquisaDoWorkspace(pesquisaId, workspaceId);
  if (!p) return NAO_ENCONTRADA;
  await db.pesquisa.update({ where: { id: p.id }, data: { exclusaoSolicitadaEm: null } });
  return { ok: true };
}

/** Segunda confirmação: só depois da carência e com o nome digitado de novo. */
export async function excluirDefinitivamente(
  pesquisaId: string,
  workspaceId: string,
  nomeDigitado: string,
  agora: Date = new Date(),
): Promise<Resultado> {
  const p = await resolvePesquisaDoWorkspace(pesquisaId, workspaceId);
  if (!p) return NAO_ENCONTRADA;
  if (!p.exclusaoSolicitadaEm) return { ok: false, erro: "Não há pedido de exclusão para esta pesquisa." };
  if (!exclusaoDefinitivaLiberada(p.exclusaoSolicitadaEm, agora)) {
    const quando = exclusaoLiberadaEm(p.exclusaoSolicitadaEm).toLocaleDateString("pt-BR");
    return { ok: false, erro: `A exclusão definitiva só é liberada ${DIAS_CARENCIA_EXCLUSAO} dias após o pedido (a partir de ${quando}).` };
  }
  if (!nomeConfere(nomeDigitado, p.nome)) {
    return { ok: false, erro: "Digite o nome da pesquisa exatamente como aparece para confirmar." };
  }
  await apagarPesquisa(p.id);
  return { ok: true };
}
