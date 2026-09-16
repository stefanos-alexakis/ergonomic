import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

test("gestor gera licenças (com códigos de teste) e baixa os cartões em PDF", async ({ page }) => {
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Licencas E2E ${sufixo}`;
  const gestorEmail = `gestor-licencas-${sufixo}@teste.local`;
  const gestorSenha = "senhaDoGestor123";

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Licencas E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill(gestorSenha);
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(gestorEmail);
  await page.getByLabel("Senha").fill(gestorSenha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/gestor$/);

  await page.getByRole("link", { name: "+ Nova pesquisa" }).click();
  await page.getByLabel("Nome da pesquisa").fill("Pesquisa Licencas E2E");
  await page.getByLabel("Quantidade de licenças").fill("20"); // 5% de 20 = 1 código de teste
  await page.getByLabel("Início").fill("2026-03-01T09:00");
  await page.getByLabel("Encerramento").fill("2026-03-15T18:00");
  await page.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);

  await page.getByRole("link", { name: "Pesquisa Licencas E2E" }).click();
  await expect(page.getByText("Nenhum código gerado ainda")).toBeVisible();

  await page.getByRole("button", { name: "Gerar licenças e códigos de acesso" }).click();

  // Depois de gerar, a tela troca o botão pela lista de códigos —
  // confere o resumo "20 ... · 1 ...códigos de teste" nessa lista.
  await expect(page.getByText(/códigos de participante/)).toBeVisible();
  await expect(page.getByText(/códigos de teste/)).toBeVisible();
  const linhasParticipante = page.locator("tr", { hasText: "PARTICIPANTE" });
  const linhasTeste = page.locator("tr", { hasText: "TESTE" });
  await expect(linhasParticipante).toHaveCount(20);
  await expect(linhasTeste).toHaveCount(1);

  // Download do PDF dos cartões — confere que é um PDF real, não uma página de erro.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Baixar cartões em PDF (com QR code)" }).click(),
  ]);
  const caminho = await download.path();
  expect(caminho).toBeTruthy();
  const fs = await import("node:fs");
  const conteudo = fs.readFileSync(caminho!);
  expect(conteudo.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  expect(conteudo.length).toBeGreaterThan(2000);
});
