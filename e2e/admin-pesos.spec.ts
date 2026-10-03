import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

test("admin da plataforma salva pesos do questionário em uso (v2, 35 perguntas)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/perguntas");
  await expect(page.getByRole("heading", { name: /versão 2/ })).toBeVisible();

  const pesos = page.getByLabel(/^Peso da pergunta:/);
  await expect(pesos).toHaveCount(35);

  // Salva sem alterar valores: exercita a action de verdade (permissão +
  // restrição ao questionário ativo) sem mudar o Score Base de ninguém.
  await page.getByRole("button", { name: "Salvar pesos" }).click();
  await expect(page.getByText("Pesos salvos.")).toBeVisible();
});

test("gestor de empresa não acessa a tela de pesos", async ({ page }) => {
  const sufixo = Date.now();
  const gestorEmail = `gestor-pesos-${sufixo}@teste.local`;

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(`Empresa Pesos E2E ${sufixo}`);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Pesos E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(gestorEmail);
  await page.getByLabel("Senha").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/gestor$/);

  await page.goto("/admin/perguntas");
  await expect(page.getByLabel(/^Peso da pergunta:/)).toHaveCount(0);
});
