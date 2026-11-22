import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function login(page: Page, email: string, senha: string, destino: RegExp) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(destino, { timeout: 15_000 });
}

async function criarEmpresa(page: Page, nome: string, gestorEmail: string) {
  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nome);
  await page.getByLabel("Nome", { exact: true }).fill(`Gestor ${nome}`);
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
}

test("relatórios do Eixo 2: lista com resultado e respostas; página que explica o score", async ({ page }) => {
  test.setTimeout(180_000);
  const sufixo = Date.now();
  const empresa = `Empresa Relatorios E2 ${sufixo}`;
  const email = `gestor-rel2-${sufixo}@teste.local`;
  const outraEmail = `gestor-rel2-b-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa Outra Rel2 ${sufixo}`, outraEmail);
  await criarEmpresa(page, empresa, email);

  const ws = await db.workspace.findFirstOrThrow({ where: { nome: empresa } });
  const questionario = await db.questionario.findFirstOrThrow({ where: { ativo: true } });
  const setor = await db.setorOrg.create({ data: { workspaceId: ws.id, nome: "Operação" } });
  const criar = (nome: string, status: "RASCUNHO" | "CONCLUIDA") =>
    db.avaliacaoEixo2.create({
      data: {
        workspaceId: ws.id,
        questionarioId: questionario.id,
        nome,
        status,
        concluidaEm: status === "CONCLUIDA" ? new Date() : null,
        setores: { create: [{ setorId: setor.id }] },
      },
    });
  const concluida = await criar("Avaliação concluída", "CONCLUIDA");
  await criar("Avaliação em curso", "RASCUNHO");

  await login(page, email, "senhaDoGestor123", /\/gestor$/);

  // Atalhos: link na tela do Eixo 2 e item do menu lateral.
  await page.goto("/gestor/eixo2");
  await page.getByRole("link", { name: "Ver todos os relatórios" }).click();
  await expect(page.getByRole("heading", { name: "Relatórios Eixo 2 · Medidas de controle" })).toBeVisible();
  await page.goto("/gestor");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("link", { name: "Relatórios Eixo 2" }).click();
  await expect(page).toHaveURL(/\/gestor\/relatorios-eixo2$/);

  const linhas = page.getByTestId("linha-relatorio");
  await expect(linhas).toHaveCount(2);
  const linhaConcluida = page.locator("tr", { hasText: "Avaliação concluída" });
  await expect(linhaConcluida).toContainText("Concluída em");
  await expect(linhaConcluida).toContainText("Concluída");
  await expect(linhaConcluida.getByRole("link", { name: /Ver resultado/ })).toBeVisible();
  await expect(linhaConcluida.getByRole("link", { name: /Ver respostas/ })).toBeVisible();
  const linhaCurso = page.locator("tr", { hasText: "Avaliação em curso" });
  await expect(linhaCurso).toContainText("Criada em");
  await expect(linhaCurso).toContainText("Em preenchimento");
  await expect(linhaCurso.getByRole("link", { name: /resultado parcial/i })).toBeVisible();
  await expect(linhaCurso.getByRole("link", { name: /Continuar preenchendo/ })).toBeVisible();

  // Os links levam às telas da própria avaliação.
  await linhaConcluida.getByRole("link", { name: /Ver respostas/ }).click();
  await expect(page).toHaveURL(new RegExp(`/gestor/eixo2/${concluida.id}$`));
  await page.goto("/gestor/relatorios-eixo2");
  await page.locator("tr", { hasText: "Avaliação concluída" }).getByRole("link", { name: /Ver resultado/ }).click();
  await expect(page).toHaveURL(new RegExp(`/gestor/eixo2/${concluida.id}/resultado$`));

  // Resumo no topo do resultado, com o atalho para a explicação completa.
  await expect(page.getByText(/O índice de controle é o mesmo fator em porcentagem|índice de controle/).first()).toBeVisible();
  await expect(page.getByText("1,00 significa nenhuma atenuação")).toBeVisible();
  await page.getByRole("link", { name: "Entenda o score do Eixo 2" }).first().click();
  await expect(page).toHaveURL(/\/gestor\/eixo2\/como-funciona$/);
  await expect(page.getByRole("heading", { name: "Como funciona o score do Eixo 2" })).toBeVisible();

  // Conteúdo: avaliação por setor, atenuação, e os valores de cada resposta (N.A. segue 0,80).
  await expect(page.getByText("A avaliação é feita por setor")).toBeVisible();
  await expect(page.getByText("atenuam", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("sem atenuante")).toBeVisible();
  await expect(page.locator("tr", { hasText: "Existente e eficaz" })).toContainText("×0,80");
  await expect(page.locator("tr", { hasText: "Existente, precisa melhorar" })).toContainText("×0,90");
  await expect(page.locator("tr", { hasText: "Inexistente" })).toContainText("×1,00");
  await expect(page.locator("tr", { hasText: "Não se aplica" })).toContainText("×0,80");
  await expect(page.getByText("×0,82 = 100%")).toHaveCount(0);
  await expect(page.getByText("×0,80 = 100%")).toBeVisible();

  // Outra empresa não enxerga estas avaliações.
  await login(page, outraEmail, "senhaDoGestor123", /\/gestor$/);
  await page.goto("/gestor/relatorios-eixo2");
  await expect(page.getByTestId("lista-vazia")).toBeVisible();
  await expect(page.getByText("Avaliação concluída")).toHaveCount(0);
});
