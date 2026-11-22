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
  carregarEstadoJornada,
  carregarRespostasSalvas,
  salvarPrePesquisa,
} from "@/lib/resposta";
import { lerPrePesquisa } from "@/lib/pre-pesquisa";
import { normalizarSugestao, primeiraPaginaPendente } from "@/lib/sugestao-melhoria";

export type EstadoFormulario = { erro?: string; valores?: Record<string, string> } | undefined;

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

  if (!setorId || !departamentoId) {
    return { erro: "Selecione setor e departamento." };
  }

  const resultado = await salvarOrganizacao(respostaId, pesquisa.workspaceId, {
    setorId,
    departamentoId,
  });
  if (!resultado.ok) return { erro: resultado.erro };

  redirect(`${caminhoBase(workspaceSlug, pesquisaSlug)}?pagina=1`);
}

/**
 * Pré-pesquisa (obrigatória quando a pesquisa a exibe): a resposta é
 * achada pelo cookie (como na página), não por um id vindo do formulário,
 * e só grava se a jornada estiver mesmo nessa etapa e tudo foi respondido.
 */
export async function salvarPrePesquisaAction(
  workspaceSlug: string,
  pesquisaSlug: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const pesquisa = await resolverOuNotFound(workspaceSlug, pesquisaSlug);
  const caminho = caminhoBase(workspaceSlug, pesquisaSlug);
  const codigoAcessoId = (await cookies()).get("codigoAcessoId")?.value;
  if (!codigoAcessoId) redirect(caminho);

  const estado = await carregarEstadoJornada(pesquisa.id, codigoAcessoId);
  if (estado.tipo === "pre_pesquisa") {
    const lido = lerPrePesquisa(formData);
    if (!lido.ok) {
      return {
        erro: `Responda todas as perguntas para continuar (falta: ${lido.faltando.join(", ")}).`,
        valores: Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)])),
      };
    }
    await salvarPrePesquisa(estado.respostaId, pesquisa.id, lido.respostas);
  }
  redirect(`${caminho}?pagina=1`);
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

  // A última página de escala segue para a pergunta aberta (opcional), que é
  // quem conclui a pesquisa — ver salvarSugestaoAction.
  redirect(`${caminho}?pagina=${paginaAtual + 1}`);
}

/**
 * Pergunta aberta final: grava a sugestão (opcional) e conclui a pesquisa.
 * A resposta é achada pelo cookie, não por id vindo do formulário, e só
 * conclui se todas as perguntas de escala foram respondidas (quem abre direto
 * o link desta página volta para a primeira página incompleta).
 */
export async function salvarSugestaoAction(
  workspaceSlug: string,
  pesquisaSlug: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const pesquisa = await resolverOuNotFound(workspaceSlug, pesquisaSlug);
  const caminho = caminhoBase(workspaceSlug, pesquisaSlug);
  const codigoAcessoId = (await cookies()).get("codigoAcessoId")?.value;
  if (!codigoAcessoId) redirect(caminho);

  const estado = await carregarEstadoJornada(pesquisa.id, codigoAcessoId);
  if (estado.tipo !== "questionario") redirect(`${caminho}?pagina=1`);

  const paginas = await carregarPaginasQuestionario(pesquisa.questionarioId);
  const pendente = primeiraPaginaPendente(paginas, await carregarRespostasSalvas(estado.respostaId));
  if (pendente !== null) redirect(`${caminho}?pagina=${pendente}`);

  const texto = String(formData.get("sugestao") ?? "");
  const lido = normalizarSugestao(texto);
  // O React 19 limpa o formulário depois do envio: devolve o texto digitado.
  if (!lido.ok) return { erro: lido.erro, valores: { sugestao: texto } };

  await concluirResposta(estado.respostaId, lido.texto);
  redirect(`${caminho}?pagina=1`);
}
