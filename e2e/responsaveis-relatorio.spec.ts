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

test("responsáveis do relatório: cadastro na empresa, ordem, marcação, emissão e retrato imutável", async ({ page }) => {
  test.setTimeout(240_000);
  const sufixo = Date.now();
  const empresa = `Empresa Responsaveis E2E ${sufixo}`;
  const outra = `Empresa Outra Resp ${sufixo}`;
  const emailOutra = `gestor-resp-b-${sufixo}@teste.local`;
  await criarEmpresa(page, outra, emailOutra);
  await criarEmpresa(page, empresa, `gestor-resp-${sufixo}@teste.local`);
  const ws = await db.workspace.findFirstOrThrow({ where: { nome: empresa } });

  // ── Cadastro: três pessoas, duas marcadas, ordem trocada ──
  await page.goto(`/admin/empresas/${ws.id}/editar`);
  const bloco = page.getByRole("region", { name: "Responsáveis do relatório" });
  await expect(bloco.getByText("Nenhum responsável cadastrado")).toBeVisible();
  for (let i = 0; i < 3; i++) await bloco.getByRole("button", { name: "Adicionar responsável" }).click();

  const preencher = async (n: number, d: { area: string; nome: string; email?: string; celular?: string; ordem: string }) => {
    await page.getByLabel(`Área / Função (responsável ${n})`).fill(d.area);
    await page.getByLabel(`Nome (responsável ${n})`).fill(d.nome);
    if (d.email) await page.getByLabel(`E-mail (responsável ${n})`).fill(d.email);
    if (d.celular) await page.getByLabel(`Celular (responsável ${n})`).fill(d.celular);
    await page.getByLabel(`Ordem (responsável ${n})`).fill(d.ordem);
  };
  await preencher(1, { area: "SESMT", nome: "Carlos Souza", email: "carlos@exemplo.com", celular: "11 98888-1111", ordem: "2" });
  await preencher(2, { area: "RH", nome: "Beatriz Alves", email: "beatriz@exemplo.com", celular: "11 97777-2222", ordem: "1" });
  await preencher(3, { area: "TI", nome: "Diego Costa", ordem: "3" });
  await expect(page.getByLabel("Empresa (responsável 1)")).toHaveValue(empresa); // vem preenchida
  await page.getByLabel("Consta no próximo relatório (responsável 3)").uncheck();

  // Erro de validação aparece e nada é salvo.
  await page.getByLabel("Nome (responsável 3)").fill("");
  await bloco.getByRole("button", { name: "Salvar responsáveis" }).click();
  await expect(bloco.getByText(/Linha 3: informe o nome/)).toBeVisible();
  expect(await db.responsavelRelatorio.count({ where: { workspaceId: ws.id } })).toBe(0);
  await page.getByLabel("Nome (responsável 3)").fill("Diego Costa");

  await bloco.getByRole("button", { name: "Salvar responsáveis" }).click();
  await expect(bloco.getByText("Responsáveis salvos (3).")).toBeVisible();

  const salvos = await db.responsavelRelatorio.findMany({ where: { workspaceId: ws.id }, orderBy: { ordem: "asc" } });
  expect(salvos.map((r) => [r.nome, r.ordem, r.incluirNoRelatorio])).toEqual([
    ["Beatriz Alves", 1, true],
    ["Carlos Souza", 2, true],
    ["Diego Costa", 3, false],
  ]);

  // Recarregar mostra a lista na ordem salva, com tudo preservado.
  await page.reload();
  await expect(page.getByLabel("Nome (responsável 1)")).toHaveValue("Beatriz Alves");
  await expect(page.getByLabel("Celular (responsável 1)")).toHaveValue("11 97777-2222");
  await expect(page.getByLabel("Consta no próximo relatório (responsável 3)")).not.toBeChecked();

  // ── Relatório: só os marcados, na ordem; e-mail e celular entram no retrato ──
  await page.goto("/admin");
  await page.locator("tr", { hasText: empresa }).getByRole("button", { name: "Acessar como gestor desta empresa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
  await page.goto("/gestor/painel/relatorio-completo");
  const lista = page.getByTestId("responsaveis-empresa");
  await expect(lista).toContainText("Beatriz Alves");
  await expect(lista).toContainText("Carlos Souza");
  await expect(lista).not.toContainText("Diego Costa");
  expect((await lista.locator("li").allTextContents()).map((t) => t.split(" ")[0])).toEqual(["Beatriz", "Carlos"]);

  const previa = await page.request.get("/gestor/painel/relatorio-completo/previa");
  expect(previa.status()).toBe(200);
  expect((await previa.body()).subarray(0, 5).toString()).toBe("%PDF-");

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Emitir versão 1" }).click();
  await expect(page.getByText("Versão 1 emitida.")).toBeVisible({ timeout: 60_000 });

  const v1 = await db.relatorioEmitido.findFirstOrThrow({ where: { workspaceId: ws.id, versao: 1 } });
  const retrato = v1.responsaveis as { nome: string; areaFuncao: string; email: string | null; celular: string | null }[];
  expect(retrato.map((r) => r.nome)).toEqual(["Beatriz Alves", "Carlos Souza"]);
  expect(retrato[0]).toMatchObject({ areaFuncao: "RH", email: "beatriz@exemplo.com", celular: "11 97777-2222" });

  // Mudar o cadastro depois não altera a versão já emitida.
  await db.responsavelRelatorio.updateMany({ where: { workspaceId: ws.id, nome: "Beatriz Alves" }, data: { nome: "Beatriz Alterada" } });
  const v1Depois = await db.relatorioEmitido.findFirstOrThrow({ where: { workspaceId: ws.id, versao: 1 } });
  expect(JSON.stringify(v1Depois.responsaveis)).not.toContain("Alterada");

  // ── Outra empresa: o gestor não edita (área do admin) e não vê estes dados ──
  await login(page, emailOutra, "senhaDoGestor123", /\/gestor$/);
  await page.goto(`/admin/empresas/${ws.id}/editar`);
  await expect(page.getByRole("region", { name: "Responsáveis do relatório" })).toHaveCount(0);
  await expect(page.getByText("Carlos Souza")).toHaveCount(0);
});
