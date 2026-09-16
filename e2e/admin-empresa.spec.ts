import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

test("admin faz login, cria empresa com gestor e vê na lista", async ({ page }) => {
  const nomeEmpresa = `Empresa E2E ${Date.now()}`;
  const gestorEmail = `gestor-${Date.now()}@teste.local`;

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Empresas clientes" })).toBeVisible();

  await page.getByRole("link", { name: "+ Nova empresa" }).click();
  await expect(page).toHaveURL(/\/admin\/empresas\/nova$/);

  await page.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");

  await page.getByRole("button", { name: "Criar empresa" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(nomeEmpresa)).toBeVisible();
});

test("recusa criar empresa sem nome", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Sem Empresa");
  await page.getByLabel("E-mail", { exact: true }).fill(`sem-empresa-${Date.now()}@teste.local`);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  // "nome" (empresa) fica vazio de propósito — o required do HTML bloqueia o submit.
  await expect(page.getByLabel("Nome da empresa")).toHaveAttribute("required", "");
});
