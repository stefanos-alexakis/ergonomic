"use server";

import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import {
  resolvePesquisaPublica,
  iniciarComCodigo,
  salvarOrganizacao,
  salvarPagina,
  concluirResposta,
  carregarPaginasQuestionario,
} from "@/lib/resposta";

export type EstadoFormulario = { erro?: string } | undefined;

function caminhoBase(workspaceSlug: string, pesquisaSlug: string) {
  return `/p/${workspaceSlug}/${pesquisaSlug}`;
}

async function resolverOuNotFound(workspaceSlug: string, pesquisaSlug: string) {
  const pesquisa = await resolvePesquisaPublica(workspaceSlug, pesquisaSlug);
  if (!pesquisa) notFound();
  return pesquisa;
}

export async function iniciarAction(
  workspaceSlug: string,
  pesquisaSlug: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const pesquisa = await resolverOuNotFound(workspaceSlug, pesquisaSlug);
  const codigo = String(formData.get("codigo") ?? "");

  const resultado = await iniciarComCodigo(pesquisa.id, codigo);
  if (!resultado.ok) return { erro: resultado.erro };

  const jar = await cookies();
  const caminho = caminhoBase(workspaceSlug, pesquisaSlug);
  jar.set("codigoAcessoId", resultado.codigoAcessoId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: caminho,
    maxAge: 60 * 60 * 24 * 60, // 60 dias — mais que suficiente para qualquer janela de pesquisa
  });
  jar.delete({ name: "codigo_digitado", path: caminho });

  // Nunca redireciona para o link "nu" (sem parâmetro) — esse link tem
  // que continuar sempre pedindo código, mesmo pra essa mesma pessoa
  // daqui a pouco. O `?pagina=1` é o sinal de "acabei de validar um
  // código agora, pode confiar no cookie desta vez" (review.md: sem
  // isso, a PRÓXIMA pessoa a abrir o link nesse aparelho herdava a
  // sessão de quem respondeu antes).
  redirect(`${caminho}?pagina=1`);
}

export async function salvarOrganizacaoAction(
  workspaceSlug: string,
  pesquisaSlug: string,
  respostaId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const pesquisa = await resolverOuNotFound(workspaceSlug, pesquisaSlug);

  const setorId = String(formData.get("setorId") ?? "");
  const departamentoId = String(formData.get("departamentoId") ?? "");
  const segmentoId = String(formData.get("segmentoId") ?? "") || undefined;
  const funcaoId = String(formData.get("funcaoId") ?? "") || undefined;

  if (!setorId || !departamentoId) {
    return { erro: "Selecione setor e departamento." };
  }

  const resultado = await salvarOrganizacao(respostaId, pesquisa.workspaceId, {
    setorId,
    departamentoId,
    segmentoId,
    funcaoId,
  });
  if (!resultado.ok) return { erro: resultado.erro };

  redirect(`${caminhoBase(workspaceSlug, pesquisaSlug)}?pagina=1`);
}

export async function salvarPaginaAction(
  workspaceSlug: string,
  pesquisaSlug: string,
  respostaId: string,
  paginaAtual: number,
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const pesquisa = await resolverOuNotFound(workspaceSlug, pesquisaSlug);
  const paginas = await carregarPaginasQuestionario(pesquisa.questionarioId);
  const pagina = paginas.find((p) => p.numeroPagina === paginaAtual);
  if (!pagina) return { erro: "Página inválida." };

  const itens = pagina.perguntas.map((p) => {
    const valorStr = formData.get(`pergunta_${p.id}`);
    return { perguntaId: p.id, valor: Number.parseInt(String(valorStr ?? ""), 10) };
  });

  const resultado = await salvarPagina(respostaId, itens);
  if (!resultado.ok) return { erro: resultado.erro };

  const caminho = caminhoBase(workspaceSlug, pesquisaSlug);
  const proximaPagina = paginas.find((p) => p.numeroPagina === paginaAtual + 1);
  redirect(proximaPagina ? `${caminho}?pagina=${proximaPagina.numeroPagina}` : `${caminho}?pagina=revisar`);
}

export async function concluirAction(workspaceSlug: string, pesquisaSlug: string, respostaId: string) {
  await concluirResposta(respostaId);
  redirect(`${caminhoBase(workspaceSlug, pesquisaSlug)}?pagina=1`);
}
