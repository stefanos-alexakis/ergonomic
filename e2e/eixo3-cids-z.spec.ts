import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

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

async function planilha(linhas: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Ocorrências");
  sheet.addRow([
    "Setor ou GHE",
    "CID (F ou Z)",
    "DESCRIÇÃO DO CID",
    "Data de início",
    "Total de dias afastados",
    "Relação com o trabalho?",
    "Justificativa / Observação",
    "Matrícula",
  ]);
  for (const l of linhas) sheet.addRow(l);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test("Eixo 3 aceita CIDs Z: agrava só o grupo A, alerta os demais e oculta os sensíveis da lista", async ({ page }) => {
  test.setTimeout(180_000);
  const sufixo = Date.now();
  const email = `gestor-z-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa CID Z ${sufixo}`, email);
  await login(page, email, "senhaDoGestor123", /\/gestor$/);

  await page.goto("/gestor/estrutura");
  const inputSetor = page.locator('form:has(input[value="setor"]) input[name="nome"]');
  await inputSetor.fill("Produção");
  await inputSetor.press("Enter");
  await expect(page.locator("li", { hasText: "Produção" })).toBeVisible();

  // O modelo traz a aba com os códigos Z aceitos.
  const modelo = await page.request.get("/gestor/eixo3/modelo");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await modelo.body()) as unknown as ArrayBuffer);
  expect(wb.worksheets.map((w) => w.name)).toContain("CIDs Z aceitos");
  expect(wb.getWorksheet("CIDs Z aceitos")!.rowCount).toBe(37); // cabeçalho + 36 códigos

  await page.goto("/gestor/eixo3/novo");
  await page.getByLabel("Nome", { exact: true }).fill("Atestados F e Z");
  await page.getByLabel("Período analisado — início").fill("2025-01-01");
  await page.getByLabel("Período analisado — fim").fill("2025-12-31");
  await page.getByRole("button", { name: "Continuar para a planilha" }).click();
  await expect(page.getByRole("heading", { name: "Atestados F e Z" })).toBeVisible();

  await page.getByLabel("Planilha de ocorrências (.xlsx)").setInputFiles({
    name: "ocorrencias-z.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await planilha([
      ["Produção", "Z73.0", "Esgotamento", "10/03/2025", 20, "Sim", "Sobrecarga", "0300"],
      ["Produção", "Z72.1", "Uso de álcool", "11/03/2025", 3, "Sim", null, "0301"],
      ["Produção", "Z57.0", "Ruído", "12/03/2025", 0, "Sim", null, "0302"],
      ["Produção", "F41", "Ansiedade", "13/03/2025", 2, "Não", null, "0303"],
      ["Produção", "M54.5", "Lombalgia", "14/03/2025", 2, "Sim", null, "0304"],
    ]),
  });
  await page.getByRole("button", { name: "Enviar planilha" }).click();
  // Outro capítulo (M54.5) entra só na contagem, sem código guardado.
  await expect(page.getByText("5 ocorrência(s) importada(s).", { exact: false })).toBeVisible();

  await page.getByLabel("Responsável pelo preenchimento (RH/DP)").last().fill("Ana do RH");
  await page.getByRole("checkbox", { name: /Declaro, como responsável/ }).check();
  await page.getByRole("button", { name: "Publicar levantamento" }).click();
  await expect(page.getByRole("button", { name: "Reabrir para editar" })).toBeVisible();

  // Z73.0 relacionado agrava Demandas, Ritmo, Horários e Equilíbrio: 4 de 13.
  const linha = page.locator("tr", { hasText: "Produção" }).first();
  await expect(linha.getByText("4 de 13")).toBeVisible();
  await expect(page.getByTestId("resumo-capitulos")).toContainText("CID Z: 3 atestado(s)");
  await expect(page.getByTestId("resumo-capitulos")).toContainText("CID F: 1 atestado(s)");
  await expect(page.getByTestId("resumo-capitulos")).toContainText("Outros CIDs: 1 atestado(s), só na contagem");
  await expect(page.getByTestId("resumo-capitulos")).toContainText("80%"); // 4 de 5 atestados são F ou Z
  await expect(page.locator("table tr", { hasText: "M54" })).toHaveCount(0);

  // Alertas dos grupos B e C (só números).
  await expect(page.getByTestId("alerta-SUBSTANCIAS")).toContainText("1 ocorrência(s)");
  await expect(page.getByTestId("alerta-AGENTE_FISICO")).toContainText("PGR de riscos físicos");

  // LGPD: o código de uso de substâncias não aparece na lista individual.
  await expect(page.getByTestId("aviso-ocultas")).toContainText("1 ocorrência(s)");
  await expect(page.locator("table tr", { hasText: "Z72.1" })).toHaveCount(0);
  await expect(page.locator("table tr", { hasText: "Z73.0" }).first()).toBeVisible();
});
