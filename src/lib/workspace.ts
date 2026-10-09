import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { gerarSlug } from "@/lib/validation";

export type CriarEmpresaInput = {
  nomeEmpresa: string;
  corPrimaria?: string | null;
  corSecundaria?: string | null;
  logoUrl?: string | null;
  gestorNome: string;
  gestorEmail: string;
  gestorSenha: string;
};

export type CriarEmpresaResultado =
  | { ok: true; workspaceId: string; slug: string }
  | { ok: false; erro: string };

/**
 * Cria o workspace da empresa cliente e o primeiro Gestor vinculado a
 * ele, numa transação — ou os dois existem, ou nenhum (não faz sentido
 * ter empresa sem gestor, nem usuário órfão sem workspace).
 */
export async function criarEmpresaComGestor(
  input: CriarEmpresaInput,
): Promise<CriarEmpresaResultado> {
  const slugBase = gerarSlug(input.nomeEmpresa);
  if (!slugBase) {
    return { ok: false, erro: "Nome da empresa precisa conter letras ou números." };
  }

  const emailExistente = await db.user.findUnique({ where: { email: input.gestorEmail } });
  if (emailExistente) {
    return { ok: false, erro: "Já existe um usuário com esse e-mail." };
  }

  // Garante slug único mesmo se duas empresas tiverem nomes parecidos.
  let slug = slugBase;
  let sufixo = 1;
  while (await db.workspace.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${++sufixo}`;
  }

  const senhaHash = await bcrypt.hash(input.gestorSenha, 12);

  const workspace = await db.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        nome: input.nomeEmpresa,
        slug,
        corPrimaria: input.corPrimaria ?? null,
        corSecundaria: input.corSecundaria ?? null,
        logoUrl: input.logoUrl ?? null,
      },
    });

    const gestor = await tx.user.create({
      data: {
        nome: input.gestorNome,
        email: input.gestorEmail,
        passwordHash: senhaHash,
        isPlatformAdmin: false,
      },
    });

    await tx.membership.create({
      data: { userId: gestor.id, workspaceId: ws.id, role: "GESTOR" },
    });

    return ws;
  });

  return { ok: true, workspaceId: workspace.id, slug: workspace.slug };
}

export async function getEmpresaParaEditar(workspaceId: string) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return null;

  const membership = await db.membership.findFirst({
    where: { workspaceId, role: "GESTOR" },
    include: { user: true },
    orderBy: { id: "asc" },
  });

  return { workspace, gestor: membership?.user ?? null };
}

export type AtualizarEmpresaInput = {
  nome: string;
  corPrimaria?: string | null;
  corSecundaria?: string | null;
  logoUrl?: string | null; // undefined = não mudar o logo atual
  isActive: boolean;
  gestorNome?: string;
  gestorEmail?: string;
};

export type AtualizarEmpresaResultado = { ok: true } | { ok: false; erro: string };

/**
 * Edita nome/logo/cores/status da empresa e, se houver gestor
 * vinculado, seus dados de nome/e-mail — nunca o slug (já está
 * impresso nos cartões/QR distribuídos, mudar quebraria o acesso) e
 * nunca a senha por aqui (fluxo de "esqueci a senha" é outra tela).
 */
export async function atualizarEmpresa(
  workspaceId: string,
  input: AtualizarEmpresaInput,
): Promise<AtualizarEmpresaResultado> {
  if (!input.nome.trim()) {
    return { ok: false, erro: "Nome da empresa é obrigatório." };
  }

  const atual = await getEmpresaParaEditar(workspaceId);
  if (!atual) return { ok: false, erro: "Empresa não encontrada." };

  if (input.gestorEmail && atual.gestor && input.gestorEmail !== atual.gestor.email) {
    const emailEmUso = await db.user.findUnique({ where: { email: input.gestorEmail } });
    if (emailEmUso) return { ok: false, erro: "Já existe um usuário com esse e-mail." };
  }

  await db.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: workspaceId },
      data: {
        nome: input.nome.trim(),
        corPrimaria: input.corPrimaria ?? null,
        corSecundaria: input.corSecundaria ?? null,
        isActive: input.isActive,
        ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      },
    });

    if (atual.gestor && (input.gestorNome || input.gestorEmail)) {
      await tx.user.update({
        where: { id: atual.gestor.id },
        data: {
          ...(input.gestorNome ? { nome: input.gestorNome.trim() } : {}),
          ...(input.gestorEmail ? { email: input.gestorEmail.trim() } : {}),
        },
      });
    }
  });

  return { ok: true };
}

export type RedefinirSenhaResultado = { ok: true } | { ok: false; erro: string };

/**
 * Redefine a senha do gestor de uma empresa — só o admin da plataforma
 * chama isto (checagem de `isPlatformAdmin` fica na action, não aqui).
 * A sessão é JWT stateless (`src/lib/auth.ts`): isso barra *novos* logins
 * com a senha antiga, mas não derruba uma sessão já aberta na hora —
 * invalidar sessão ativa exigiria trocar a estratégia pra sessão em
 * banco, fora do escopo pedido.
 */
export async function redefinirSenhaGestor(
  gestorUserId: string,
  novaSenha: string,
): Promise<RedefinirSenhaResultado> {
  if (novaSenha.length < 8) {
    return { ok: false, erro: "Senha precisa ter 8 ou mais caracteres." };
  }
  const senhaHash = await bcrypt.hash(novaSenha, 12);
  await db.user.update({ where: { id: gestorUserId }, data: { passwordHash: senhaHash } });
  return { ok: true };
}

/** O que some junto com a empresa — mostrado na tela antes de confirmar. */
export async function resumoParaExcluir(workspaceId: string) {
  const [pesquisas, respostas, avaliacoesEixo2, levantamentosEixo3, acoesPlano, gestores] = await Promise.all([
    db.pesquisa.count({ where: { workspaceId } }),
    db.resposta.count({ where: { codigoAcesso: { pesquisa: { workspaceId } } } }),
    db.avaliacaoEixo2.count({ where: { workspaceId } }),
    db.levantamentoEixo3.count({ where: { workspaceId } }),
    db.acaoPlano.count({ where: { workspaceId } }),
    usuariosSoDestaEmpresa(db, workspaceId),
  ]);
  return { pesquisas, respostas, avaliacoesEixo2, levantamentosEixo3, acoesPlano, gestores: gestores.length };
}

type Cliente = Pick<typeof db, "user">;

/**
 * Usuários que ficariam órfãos: vínculo (não temporário) só com esta
 * empresa. Admin da plataforma nunca entra — nem quando está "acessando
 * como gestor" (o vínculo dele é `impersonada` e some com a empresa).
 */
function usuariosSoDestaEmpresa(cliente: Cliente, workspaceId: string) {
  return cliente.user.findMany({
    where: {
      isPlatformAdmin: false,
      memberships: { some: { workspaceId }, every: { workspaceId } },
    },
    select: { id: true },
  });
}

export type ExcluirEmpresaResultado =
  | { ok: true; logoUrl: string | null; arquivosRelatorios: string[] }
  | { ok: false; erro: string };

/**
 * Exclusão definitiva, em cascata: pesquisas, códigos, respostas, Eixos 2
 * e 3, plano de ação, setores — tudo pende de `Workspace` com
 * `onDelete: Cascade` no schema (e um teste E2E confere que nada sobra). Os gestores que só pertenciam a esta
 * empresa saem junto (senão viram login sem empresa). Só com a empresa
 * INATIVA: duas etapas de propósito, contra clique errado. Quem chama
 * apaga o arquivo do logo depois que a transação deu certo.
 */
export async function excluirEmpresa(workspaceId: string, confirmacao: string): Promise<ExcluirEmpresaResultado> {
  const ws = await db.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) return { ok: false, erro: "Empresa não encontrada." };
  if (ws.isActive) return { ok: false, erro: "Inative a empresa antes de excluí-la." };
  if (confirmacao.trim() !== ws.nome.trim()) {
    return { ok: false, erro: "Digite o nome da empresa exatamente como aparece para confirmar." };
  }

  const arquivosRelatorios = (
    await db.relatorioEmitido.findMany({ where: { workspaceId }, select: { arquivo: true } })
  ).map((r) => r.arquivo);
  await db.$transaction(async (tx) => {
    const orfaos = await usuariosSoDestaEmpresa(tx, workspaceId);
    // Ordem explícita, não um único DELETE na empresa: apagando tudo de uma
    // vez, o Postgres segue dois caminhos até a mesma resposta (setor →
    // SET NULL e pesquisa → código → CASCADE) e acusa violação de chave em
    // Resposta_codigoAcessoId_fkey (achado no E2E desta exclusão).
    await tx.pesquisa.deleteMany({ where: { workspaceId } });
    await tx.acaoPlano.deleteMany({ where: { workspaceId } });
    await tx.avaliacaoEixo2.deleteMany({ where: { workspaceId } });
    await tx.levantamentoEixo3.deleteMany({ where: { workspaceId } });
    await tx.workspace.delete({ where: { id: workspaceId } });
    if (orfaos.length) await tx.user.deleteMany({ where: { id: { in: orfaos.map((u) => u.id) } } });
  });
  return { ok: true, logoUrl: ws.logoUrl, arquivosRelatorios };
}

/**
 * Ativa/inativa direto da lista de empresas. Recebe o estado desejado (não
 * "inverte"): clique duplo ou duas abas abertas não desfazem a mudança.
 */
export async function definirStatusEmpresa(workspaceId: string, ativa: boolean): Promise<void> {
  await db.workspace.updateMany({ where: { id: workspaceId }, data: { isActive: ativa } });
}
