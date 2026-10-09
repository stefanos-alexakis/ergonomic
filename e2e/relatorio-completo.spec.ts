import { test, expect, type Page } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function login(page: Page, email: string, senha: string, destino: RegExp) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(destino, { timeout: 15_000 });
}

async function criarEmpresa(page: Page, nome: string, email: string) {
  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nome);
  await page.getByLabel("Nome", { exact: true }).fill(`Gestor ${nome}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("relatório completo: consultoria redige e emite versões; gestor baixa; outra empresa não; excluir a empresa apaga os PDFs", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const sufixo = Date.now();
  const empresa = `Empresa Relatorio E2E ${sufixo}`;
  const gestor = `gestor-rel-${sufixo}@teste.local`;
  const consultor = `Consultora E2E ${sufixo}`;

  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);

  // Consultor cadastrado no admin.
  await page.goto("/admin/consultores");
  await page.getByLabel("Nome (novo consultor)").fill(consultor);
  await page.getByLabel("Formação (novo consultor)").fill("Psicóloga do Trabalho");
  await page.getByLabel("Registro profissional (novo consultor)").fill("CRP 06/000000");
  await page.getByRole("button", { name: "Cadastrar consultor" }).click();
  await expect(page.getByText(`Consultor ${consultor} cadastrado.`)).toBeVisible();

  // Empresa com uma pesquisa respondida (5 pessoas num setor).
  await criarEmpresa(page, empresa, gestor);
  const ws = await db.workspace.findFirstOrThrow({ where: { nome: empresa } });
  const questionario = await db.questionario.findFirstOrThrow({ where: { ativo: true } });
  const perguntas = await db.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: questionario.id } } } },
    select: { id: true },
  });
  const setor = await db.setorOrg.create({ data: { workspaceId: ws.id, nome: "Operação" } });
  const pesquisa = await db.pesquisa.create({
    data: {
      workspaceId: ws.id,
      questionarioId: questionario.id,
      nome: "Pesquisa Relatório",
      slug: `pesquisa-rel-${sufixo}`,
      dataInicio: new Date(Date.now() - 86_400_000),
      dataFim: new Date(Date.now() + 86_400_000),
      licencasSolicitadas: 10,
    },
  });
  for (let i = 0; i < 5; i++) {
    const codigo = await db.codigoAcesso.create({
      data: { pesquisaId: pesquisa.id, codigo: `REL${sufixo}${i}`, tipo: "PARTICIPANTE", status: "CONCLUIDO" },
    });
    await db.resposta.create({
      data: {
        codigoAcessoId: codigo.id,
        setorId: setor.id,
        concluidoEm: new Date(),
        itens: { create: perguntas.map((p) => ({ perguntaId: p.id, valor: 4 })) },
      },
    });
  }

  // Consultoria (admin na visão de gestor) redige o rascunho.
  await page.goto("/admin");
  await page.locator("tr", { hasText: empresa }).getByRole("button", { name: "Acessar como gestor desta empresa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
  await page.goto("/gestor/painel");
  await page.getByRole("link", { name: "Relatório completo" }).click();
  await expect(page.getByRole("heading", { name: "Relatório completo" })).toBeVisible();
  await expect(page.getByText("Nenhuma versão emitida ainda.")).toBeVisible();

  await page.getByLabel("Conclusão do consultor").fill("A empresa apresenta índice médio.\n\n# Recomendações\n\n- Revisar a jornada");
  await page.getByRole("checkbox", { name: new RegExp(consultor) }).check();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Conclusão do consultor")).toHaveValue(/Revisar a jornada/);
  await expect(page.getByRole("checkbox", { name: new RegExp(consultor) })).toBeChecked();

  const previa = await page.request.get("/gestor/painel/relatorio-completo/previa");
  expect(previa.status()).toBe(200);
  expect((await previa.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect(await db.relatorioEmitido.count({ where: { workspaceId: ws.id } })).toBe(0); // prévia não grava

  // Emite v1 e v2.
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Emitir versão 1" }).click();
  await expect(page.getByText("Versão 1 emitida.")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Emitir versão 2" }).click();
  await expect(page.getByText("Versão 2 emitida.")).toBeVisible({ timeout: 60_000 });
  const versoes = page.getByRole("region", { name: "Versões emitidas" });
  await expect(versoes.locator("tbody tr")).toHaveCount(2);
  await expect(versoes).toContainText("Pesquisa Relatório");

  const emitidos = await db.relatorioEmitido.findMany({ where: { workspaceId: ws.id }, orderBy: { versao: "asc" } });
  expect(emitidos.map((e) => e.versao)).toEqual([1, 2]);
  expect(JSON.stringify(emitidos[0]!.consultores)).toContain(consultor);
  const arquivos = emitidos.map((e) => join(process.cwd(), "uploads", "relatorios", e.arquivo));
  for (const a of arquivos) expect(existsSync(a)).toBe(true);

  // Editar o consultor não altera a versão já emitida.
  await page.getByRole("button", { name: /Sair e voltar para admin/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/consultores");
  await page.getByLabel(`Nome de ${consultor}`).fill(`${consultor} (editada)`);
  await page.getByLabel(`Nome de ${consultor}`).locator("xpath=ancestor::form").getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByLabel(`Nome de ${consultor} (editada)`)).toBeVisible();
  const v1 = await db.relatorioEmitido.findFirstOrThrow({ where: { workspaceId: ws.id, versao: 1 } });
  expect(JSON.stringify(v1.consultores)).not.toContain("(editada)");

  // Gestor da empresa: só vê e baixa.
  await page.context().clearCookies();
  await login(page, gestor, "senhaDoGestor123", /\/gestor$/);
  await page.goto("/gestor/painel/relatorio-completo");
  await expect(page.getByText(/redigido e emitido pela consultoria/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Emitir versão/ })).toHaveCount(0);
  const download = await page.request.get("/gestor/painel/relatorio-completo/versao/1");
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect((await page.request.get("/gestor/painel/relatorio-completo/previa")).status()).toBe(403);
  expect((await page.request.get("/gestor/painel/relatorio-completo/versao/9")).status()).toBe(404);

  // Gestor de outra empresa: a v1 desta não existe para ele.
  const outra = `Empresa Relatorio B ${sufixo}`;
  const outroGestor = `gestor-rel-b-${sufixo}@teste.local`;
  await page.context().clearCookies();
  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await criarEmpresa(page, outra, outroGestor);
  await page.context().clearCookies();
  await login(page, outroGestor, "senhaDoGestor123", /\/gestor$/);
  expect((await page.request.get("/gestor/painel/relatorio-completo/versao/1")).status()).toBe(404);

  // Excluir a empresa apaga também os PDFs gravados.
  await page.context().clearCookies();
  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await page.getByRole("button", { name: `Inativar ${empresa}` }).click();
  await expect(page.locator("tr", { hasText: empresa }).getByText("Inativa")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("main").getByRole("link", { name: empresa }).click();
  await page.getByLabel(/para confirmar/).fill(empresa);
  await page.getByRole("button", { name: "Excluir empresa e todos os dados" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
  expect(await db.relatorioEmitido.count({ where: { workspaceId: ws.id } })).toBe(0);
  for (const a of arquivos) expect(existsSync(a)).toBe(false);

  // Limpeza: consultor de teste.
  await db.consultor.deleteMany({ where: { nome: { startsWith: consultor } } });
});

test.afterAll(async () => {
  await db.$disconnect();
});
