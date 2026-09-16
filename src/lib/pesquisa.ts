import { db } from "@/lib/db";
import { gerarSlug } from "@/lib/validation";

export type CriarPesquisaInput = {
  workspaceId: string;
  questionarioId: string;
  nome: string;
  dataInicio: Date;
  dataFim: Date;
  licencasSolicitadas: number;
};

export type CriarPesquisaResultado =
  | { ok: true; pesquisaId: string }
  | { ok: false; erro: string };

/**
 * Regras de negócio da criação (spec.md §4): datas coerentes e
 * quantidade de licenças positiva. A geração dos códigos em si
 * (participante + teste) é responsabilidade da Fase 4 — aqui só nasce
 * a pesquisa em RASCUNHO.
 */
export async function criarPesquisa(
  input: CriarPesquisaInput,
): Promise<CriarPesquisaResultado> {
  if (!input.nome.trim()) {
    return { ok: false, erro: "Nome da pesquisa é obrigatório." };
  }
  if (!(input.dataFim.getTime() > input.dataInicio.getTime())) {
    return { ok: false, erro: "Data/hora de encerramento precisa ser depois do início." };
  }
  if (!Number.isInteger(input.licencasSolicitadas) || input.licencasSolicitadas < 1) {
    return { ok: false, erro: "Quantidade de licenças precisa ser um número inteiro positivo." };
  }

  // O nome vira o slug da URL pública (/p/<workspace>/<pesquisa>) — duas
  // pesquisas com o mesmo nome na mesma empresa colidiriam ali. Em vez de
  // resolver isso "por trás" com um sufixo numérico invisível (o que gerava
  // uma URL diferente da esperada sem avisar ninguém — achado do usuário em
  // teste manual), rejeita de cara e pede um nome diferente.
  const nomeNormalizado = input.nome.trim();
  const jaExiste = await db.pesquisa.findFirst({
    where: { workspaceId: input.workspaceId, nome: { equals: nomeNormalizado, mode: "insensitive" } },
  });
  if (jaExiste) {
    return { ok: false, erro: "Já existe uma pesquisa com esse nome nesta empresa. Escolha um nome diferente." };
  }

  const slugBase = gerarSlug(input.nome) || "pesquisa";
  let slug = slugBase;
  let sufixo = 1;
  while (
    await db.pesquisa.findUnique({ where: { workspaceId_slug: { workspaceId: input.workspaceId, slug } } })
  ) {
    slug = `${slugBase}-${++sufixo}`;
  }

  const pesquisa = await db.pesquisa.create({
    data: {
      workspaceId: input.workspaceId,
      questionarioId: input.questionarioId,
      nome: input.nome.trim(),
      slug,
      dataInicio: input.dataInicio,
      dataFim: input.dataFim,
      licencasSolicitadas: input.licencasSolicitadas,
      status: "RASCUNHO",
    },
  });

  return { ok: true, pesquisaId: pesquisa.id };
}

/**
 * Nunca confiar num `pesquisaId` vindo da URL sem confirmar que ele
 * pertence ao workspace de quem está pedindo — mesma regra de
 * isolamento multi-tenant aplicada aqui, não só no formulário público
 * do colaborador (constitution.md §2).
 */
export async function resolvePesquisaDoWorkspace(pesquisaId: string, workspaceId: string) {
  return db.pesquisa.findFirst({ where: { id: pesquisaId, workspaceId } });
}

/**
 * Empresa inativa = gestor sem empresa vinculada, do ponto de vista de
 * toda tela/action da área do gestor — mesmo filtro `isActive` que já
 * vale para o admin (`resolveWorkspace`) e para a jornada pública
 * (`resolvePesquisaPublica`), agora também aqui.
 */
export async function getWorkspaceDoGestor(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId, workspace: { isActive: true, deletedAt: null } },
    include: { workspace: true },
    orderBy: { id: "asc" },
  });
  return membership?.workspace ?? null;
}
