import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

test("admin inativa, exclui a empresa e nada dela sobra no banco (cascata)", async ({ page }) => {
  test.setTimeout(60_000);
  const sufixo = Date.now();
  const nome = `Empresa Excluir E2E ${sufixo}`;
  const gestorEmail = `gestor-excluir-${sufixo}@teste.local`;

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nome);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Excluir E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Dados em todos os eixos e no plano, direto no banco.
  const ws = await db.workspace.findFirstOrThrow({ where: { nome } });
  const questionario = await db.questionario.findFirstOrThrow({ where: { ativo: true } });
  const setor = await db.setorOrg.create({ data: { workspaceId: ws.id, nome: "Setor X" } });
  const depto = await db.departamento.create({ data: { workspaceId: ws.id, nome: "Depto X" } });
  const pesquisa = await db.pesquisa.create({
    data: {
      workspaceId: ws.id,
      questionarioId: questionario.id,
      nome: "P",
      slug: `p-${sufixo}`,
      dataInicio: new Date(),
      dataFim: new Date(),
      licencasSolicitadas: 1,
    },
  });
  const codigo = await db.codigoAcesso.create({
    data: { pesquisaId: pesquisa.id, codigo: `EXC${sufixo}`, tipo: "PARTICIPANTE", status: "CONCLUIDO" },
  });
  const pergunta = await db.pergunta.findFirstOrThrow({ where: { fatorRisco: { dimensao: { bloco: { questionarioId: questionario.id } } } } });
  const resposta = await db.resposta.create({
    data: { codigoAcessoId: codigo.id, setorId: setor.id, departamentoId: depto.id, concluidoEm: new Date() },
  });
  await db.respostaItem.create({ data: { respostaId: resposta.id, perguntaId: pergunta.id, valor: 3 } });
  const avaliacao = await db.avaliacaoEixo2.create({
    data: { workspaceId: ws.id, questionarioId: questionario.id, nome: "A", setores: { create: { setorId: setor.id } } },
  });
  const questao = await db.questaoEixo2.findFirstOrThrow();
  await db.respostaEixo2.create({ data: { avaliacaoId: avaliacao.id, questaoId: questao.id, setorId: setor.id, condicao: "EFICAZ" } });
  const levantamento = await db.levantamentoEixo3.create({
    data: {
      workspaceId: ws.id,
      nome: "L",
      periodoInicio: new Date(),
      periodoFim: new Date(),
      responsavel: "R",
      cargoResponsavel: "C",
      ocorrencias: {
        create: { setorId: setor.id, setorOriginal: "Setor X", linhaPlanilha: 2, cid: "F41.1", dataInicio: new Date(), diasAfastados: 1, relacao: "SIM" },
      },
    },
  });
  const acao = await db.acaoPlano.create({
    data: {
      workspaceId: ws.id,
      numero: 1,
      oque: "Ação",
      origemAvaliacaoId: avaliacao.id,
      setores: { create: { setorId: setor.id } },
      historico: { create: { autor: "x", tipo: "CRIADA", descricao: "x" } },
    },
  });
  await db.acaoPlano.create({ data: { workspaceId: ws.id, numero: 2, oque: "Corretiva", acaoOrigemId: acao.id } });

  // Ativa: a exclusão não está disponível.
  await page.reload();
  await page.getByRole("main").getByRole("link", { name: nome }).click();
  await expect(page.getByText(/A exclusão só fica disponível para empresas inativas/)).toBeVisible();

  // Inativa pela lista.
  await page.goto("/admin");
  await page.getByRole("button", { name: `Inativar ${nome}` }).click();
  // A lista local acumula centenas de empresas de E2E: dá mais tempo ao recarregamento.
  await expect(page.locator("tr", { hasText: nome }).getByText("Inativa")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("main").getByRole("link", { name: nome }).click();
  await expect(page.getByText("1 pesquisa(s), com 1 resposta(s) do Eixo 1")).toBeVisible();
  const botao = page.getByRole("button", { name: "Excluir empresa e todos os dados" });
  await page.getByLabel(/para confirmar/).fill("nome errado");
  await expect(botao).toBeDisabled();
  await page.getByLabel(/para confirmar/).fill(nome);
  page.once("dialog", (d) => d.accept());
  await botao.click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(nome)).not.toBeVisible({ timeout: 20_000 });

  // Nada sobrou, e o gestor (só desta empresa) também saiu; o admin, não.
  expect(await db.workspace.count({ where: { id: ws.id } })).toBe(0);
  expect(await db.pesquisa.count({ where: { id: pesquisa.id } })).toBe(0);
  expect(await db.resposta.count({ where: { id: resposta.id } })).toBe(0);
  expect(await db.avaliacaoEixo2.count({ where: { id: avaliacao.id } })).toBe(0);
  expect(await db.levantamentoEixo3.count({ where: { id: levantamento.id } })).toBe(0);
  expect(await db.acaoPlano.count({ where: { workspaceId: ws.id } })).toBe(0);
  expect(await db.acaoPlanoHistorico.count({ where: { acaoId: acao.id } })).toBe(0);
  expect(await db.setorOrg.count({ where: { workspaceId: ws.id } })).toBe(0);
  expect(await db.user.count({ where: { email: gestorEmail } })).toBe(0);
  expect(await db.user.count({ where: { email: ADMIN_EMAIL } })).toBe(1);
});

test.afterAll(async () => {
  await db.$disconnect();
});
