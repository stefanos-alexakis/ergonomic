import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

async function loginComoAdmin(page: import("@playwright/test").Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("admin redefine a senha do gestor de uma empresa", async ({ page }) => {
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Senha E2E ${sufixo}`;
  const gestorEmail = `gestor-senha-${sufixo}@teste.local`;
  const senhaOriginal = "senhaDoGestor123";
  const senhaNova = "senhaNovaDoGestor456";

  await loginComoAdmin(page);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Senha E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill(senhaOriginal);
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("main").getByRole("link", { name: nomeEmpresa }).click();
  await expect(page).toHaveURL(/\/admin\/empresas\/.+\/editar$/);

  await page.getByLabel("Nova senha").fill(senhaNova);
  await page.getByRole("button", { name: "Definir nova senha" }).click();
  await expect(page.getByText("Senha redefinida com sucesso.")).toBeVisible();

  // A senha antiga não funciona mais.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(gestorEmail);
  await page.getByLabel("Senha").fill(senhaOriginal);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible();

  // A senha nova funciona.
  await page.getByLabel("E-mail").fill(gestorEmail);
  await page.getByLabel("Senha").fill(senhaNova);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
});

test("admin assume a visão de gestor de uma empresa e sai de volta", async ({ page }) => {
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Impersonar E2E ${sufixo}`;
  const gestorEmail = `gestor-impersonar-${sufixo}@teste.local`;

  await loginComoAdmin(page);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Impersonar E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Clica na seta ao lado do nome da empresa recém-criada.
  const linhaEmpresa = page.locator("tr", { hasText: nomeEmpresa });
  await linhaEmpresa.getByRole("button", { name: "Acessar como gestor desta empresa" }).click();

  await expect(page).toHaveURL(/\/gestor$/);
  await expect(page.getByText(`Você está vendo como ${nomeEmpresa}`)).toBeVisible();

  // Acesso completo de gestor: cadastra setor/departamento e cria pesquisa.
  await page.getByRole("link", { name: "Setores e departamentos" }).click();
  const inputSetor = page.locator('form:has(input[value="setor"]) input[name="nome"]');
  await inputSetor.fill("Setor Impersonado E2E");
  await inputSetor.press("Enter");
  await expect(page.getByText("Setor Impersonado E2E")).toBeVisible();

  await page.goto("/gestor");
  await page.getByRole("link", { name: "+ Nova pesquisa" }).click();
  await page.getByLabel("Nome da pesquisa").fill("Pesquisa Impersonada E2E");
  await page.getByLabel("Quantidade de licenças").fill("5");
  await page.getByLabel("Início").fill("2026-03-01T09:00");
  await page.getByLabel("Encerramento").fill("2026-03-15T18:00");
  await page.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
  await expect(page.getByText("Pesquisa Impersonada E2E")).toBeVisible();

  // Sai da impersonação e volta para o admin.
  await page.getByRole("button", { name: "Sair e voltar para admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Sem clicar de novo na seta, o admin não tem mais vínculo com a empresa.
  await page.goto("/gestor");
  await expect(page.getByText(/usuário ainda não está vinculado a uma empresa/i)).toBeVisible();
});
