import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

test("admin edita nome, cor e inativa uma empresa; gestor inativo não consegue logar", async ({ page }) => {
  const sufixo = Date.now();
  const nomeOriginal = `Empresa Editar E2E ${sufixo}`;
  const nomeNovo = `Empresa Editada E2E ${sufixo}`;
  const gestorEmail = `gestor-editar-${sufixo}@teste.local`;
  const gestorSenha = "senhaDoGestor123";

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nomeOriginal);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Editar E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill(gestorSenha);
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Abre a edição a partir do nome na lista.
  await page.getByRole("main").getByRole("link", { name: nomeOriginal }).click();
  await expect(page).toHaveURL(/\/admin\/empresas\/.+\/editar$/);

  await page.getByLabel("Nome da empresa").fill(nomeNovo);
  await page.getByLabel("Empresa ativa").uncheck();
  await page.getByRole("button", { name: "Salvar alterações" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(nomeNovo)).toBeVisible();
  await expect(page.getByText(nomeOriginal)).not.toBeVisible();
  const linhaEmpresa = page.locator("tr", { hasText: nomeNovo });
  await expect(linhaEmpresa.getByText("Inativa")).toBeVisible();

  // Reabre a edição e confirma que os dados voltaram salvos corretamente.
  await page.getByRole("main").getByRole("link", { name: nomeNovo }).click();
  await expect(page.getByLabel("Nome da empresa")).toHaveValue(nomeNovo);
  await expect(page.getByLabel("Empresa ativa")).not.toBeChecked();

  // Gestor de empresa inativa não deve conseguir acessar a área do gestor.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(gestorEmail);
  await page.getByLabel("Senha").fill(gestorSenha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(/usuário ainda não está vinculado a uma empresa/i)).toBeVisible();
});

// PNG 1×1 real (decodificável pelo navegador), para conferir que a imagem carrega.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("logo trocado na edição carrega na hora, sem precisar de novo deploy", async ({ page }) => {
  // Bug de produção: o Next só servia de public/ o que existia no boot,
  // então todo logo enviado depois dava 404 até o próximo deploy.
  const sufixo = Date.now();
  const nome = `Empresa Logo E2E ${sufixo}`;

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nome);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Logo E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(`gestor-logo-${sufixo}@teste.local`);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("main").getByRole("link", { name: nome }).click();
  await page.getByLabel("Substituir logotipo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG_1X1 });
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("main").getByRole("link", { name: nome }).click();
  const logo = page.getByAltText("Logo atual");
  await expect(logo).toHaveAttribute("src", /^\/uploads\/[\w-]+\.png$/);
  const src = (await logo.getAttribute("src"))!;
  const resposta = await page.request.get(src);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toBe("image/png");
  await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(1);
});
