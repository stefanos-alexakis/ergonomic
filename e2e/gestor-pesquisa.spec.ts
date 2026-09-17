import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

async function gerarPlanilhaTeste(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Estrutura");
  sheet.addRow(["Setor", "Departamento"]);
  sheet.addRow(["Produção E2E", "Linha 1"]);
  sheet.addRow(["Administrativo E2E", "Financeiro"]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test("gestor cria pesquisa e importa estrutura organizacional por planilha", async ({ page }) => {
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Gestor E2E ${sufixo}`;
  const gestorEmail = `gestor-fluxo-${sufixo}@teste.local`;
  const gestorSenha = "senhaDoGestor123";

  // 1. Admin cria a empresa com o gestor.
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Fluxo E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill(gestorSenha);
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(nomeEmpresa)).toBeVisible();

  // 2. "Logout" (limpa cookies) e login como o gestor recém-criado.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(gestorEmail);
  await page.getByLabel("Senha").fill(gestorSenha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
  // O nome da empresa aparece tanto na barra superior quanto no cabeçalho
  // da página — escopar ao <main> evita ambiguidade de seletor.
  await expect(page.getByRole("main").getByText(nomeEmpresa)).toBeVisible();

  // 3. Cria uma pesquisa.
  await page.getByRole("link", { name: "+ Nova pesquisa" }).click();
  await page.getByLabel("Nome da pesquisa").fill("Pesquisa E2E 2026");
  await page.getByLabel("Quantidade de licenças").fill("50");
  await page.getByLabel("Início").fill("2026-03-01T09:00");
  await page.getByLabel("Encerramento").fill("2026-03-15T18:00");
  await page.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
  await expect(page.getByText("Pesquisa E2E 2026")).toBeVisible();
  await expect(page.getByText("RASCUNHO")).toBeVisible();

  // 3b. Tentar criar outra pesquisa com o MESMO nome tem que ser recusado —
  // o nome vira o slug da URL pública, então duas pesquisas com o mesmo
  // nome colidiriam ali (achado do usuário em teste manual: antes disso o
  // sistema só desambiguava a URL por trás, com um sufixo silencioso).
  await page.getByRole("link", { name: "+ Nova pesquisa" }).click();
  await page.getByLabel("Nome da pesquisa").fill("Pesquisa E2E 2026");
  await page.getByLabel("Quantidade de licenças").fill("10");
  await page.getByLabel("Início").fill("2026-04-01T09:00");
  await page.getByLabel("Encerramento").fill("2026-04-15T18:00");
  await page.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(page.getByText("Já existe uma pesquisa com esse nome nesta empresa. Escolha um nome diferente.")).toBeVisible();
  await expect(page).toHaveURL(/\/gestor\/pesquisas\/nova$/);

  // 4. Importa a planilha de estrutura organizacional.
  await page.getByRole("link", { name: "Setores e departamentos" }).click();
  const buffer = await gerarPlanilhaTeste();
  await page.locator('input[name="planilha"]').setInputFiles({
    name: "estrutura.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await page.getByRole("button", { name: "Importar planilha" }).click();
  await expect(page.getByText(/itens importados com sucesso/)).toBeVisible();
  await expect(page.getByText("Produção E2E")).toBeVisible();
  await expect(page.getByText("Administrativo E2E")).toBeVisible();

  // 5. Cadastro manual de mais um setor.
  const primeiroFormNome = page.locator('form:has(input[name="tipo"][value="setor"]) input[name="nome"]');
  await primeiroFormNome.fill("Setor Manual E2E");
  await primeiroFormNome.press("Enter");
  await expect(page.getByText("Setor Manual E2E")).toBeVisible();

  // 6. Editar e excluir um item do catálogo — antes só dava para adicionar,
  // um setor digitado errado ficava errado pra sempre (pedido do cliente).
  const linhaSetorManual = page.locator("li", { hasText: "Setor Manual E2E" });
  await linhaSetorManual.getByText("editar").click();
  // Ao entrar em modo edição o texto "Setor Manual E2E" some do <li> (vira
  // `value` de um <input>, que não conta como texto para `hasText`) — por
  // isso a partir daqui a linha precisa ser localizada pelo próprio input,
  // não mais pelo texto (achado rodando este E2E: `linhaSetorManual` ficava
  // stale e o `.fill()` seguinte nunca encontrava nada).
  const linhaEmEdicao = page.locator('li:has(input[name="nome"][value="Setor Manual E2E"])');
  await linhaEmEdicao.locator('input[name="nome"]').fill("Setor Manual E2E Renomeado");
  await linhaEmEdicao.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Setor Manual E2E Renomeado")).toBeVisible();
  await expect(page.getByText("Setor Manual E2E", { exact: true })).not.toBeVisible();

  const linhaRenomeada = page.locator("li", { hasText: "Setor Manual E2E Renomeado" });
  await linhaRenomeada.getByText("excluir").click();
  await linhaRenomeada.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Setor Manual E2E Renomeado")).not.toBeVisible();
});
