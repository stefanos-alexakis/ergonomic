import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
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
  await expect(page).toHaveURL(destino);
}

async function criarEmpresa(page: Page, nome: string, gestorEmail: string) {
  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nome);
  await page.getByLabel("Nome", { exact: true }).fill(`Gestor ${nome}`);
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function planilhaOcorrencias(linhas: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Ocorrências");
  sheet.addRow([
    "Setor ou GHE",
    "CID-F",
    "DESCRIÇÃO DO CID",
    "Data de início",
    "Total de dias afastados",
    "Relação com o trabalho?",
    "Justificativa / Observação",
  ]);
  for (const l of linhas) sheet.addRow(l);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/**
 * Cenário com conta feita à mão:
 *  - Produção: 6 respondentes, todas as respostas = 5 → Eixo 1 = 5,00 em todo fator;
 *  - Eixo 2: tudo "eficaz" (0,80), exceto Horários e Jornada "precisa melhorar" (0,90);
 *  - Eixo 3: F51.2 relacionado ao trabalho → ×1,10 só em Horários e Equilíbrio Trabalho-Vida.
 *  Horários = 5 × 0,90 × 1,10 = 4,95 (PGR) · Equilíbrio = 5 × 0,80 × 1,10 = 4,40 (PGR)
 *  demais = 5 × 0,80 = 4,00 (controle) · setor = média 4,10 → nota 257.
 *  - Administrativo: 2 respondentes → amostra insuficiente (anonimato).
 */
test("Eixo 3 publicado e Painel FRPRT com o cruzamento dos três eixos", async ({ page }) => {
  test.setTimeout(180_000);
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Eixo3 E2E ${sufixo}`;
  const gestorEmail = `gestor-eixo3-${sufixo}@teste.local`;
  await criarEmpresa(page, nomeEmpresa, gestorEmail);
  await login(page, gestorEmail, "senhaDoGestor123", /\/gestor$/);

  // Setores + nº de colaboradores pelo cadastro.
  await page.goto("/gestor/estrutura");
  const inputSetor = page.locator('form:has(input[value="setor"]) input[name="nome"]');
  for (const nome of ["Produção", "Administrativo"]) {
    await inputSetor.fill(nome);
    await inputSetor.press("Enter");
    await expect(page.locator("li", { hasText: nome })).toBeVisible();
  }
  const linhaProducao = page.locator("li", { hasText: "Produção" });
  await linhaProducao.getByText("editar").click();
  await page.getByLabel("Nº de colaboradores do setor").fill("10");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("· 10 colab.")).toBeVisible();

  // Pesquisa (Eixo 1) pela UI; respostas semeadas no banco.
  await page.goto("/gestor/pesquisas/nova");
  await page.getByLabel("Nome da pesquisa").fill("Pesquisa Eixo3 E2E");
  await page.getByLabel("Quantidade de licenças").fill("20");
  await page.getByLabel("Início").fill("2026-01-01T09:00");
  await page.getByLabel("Encerramento").fill("2026-12-31T18:00");
  await page.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);

  const workspace = await db.workspace.findFirstOrThrow({ where: { nome: nomeEmpresa } });
  const pesquisa = await db.pesquisa.findFirstOrThrow({ where: { workspaceId: workspace.id } });
  const setores = await db.setorOrg.findMany({ where: { workspaceId: workspace.id } });
  const producao = setores.find((s) => s.nome === "Produção")!;
  const administrativo = setores.find((s) => s.nome === "Administrativo")!;
  const perguntas = await db.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: pesquisa.questionarioId } } } },
    select: { id: true, questaoEixo2: { select: { id: true } }, fatorRisco: { select: { dimensao: { select: { nome: true } } } } },
  });
  for (const [setorId, n] of [
    [producao.id, 6],
    [administrativo.id, 2],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const codigo = await db.codigoAcesso.create({
        data: { pesquisaId: pesquisa.id, codigo: `E3${sufixo}${setorId.slice(-4)}${i}`, tipo: "PARTICIPANTE", status: "CONCLUIDO" },
      });
      const r = await db.resposta.create({ data: { codigoAcessoId: codigo.id, setorId, concluidoEm: new Date() } });
      await db.respostaItem.createMany({ data: perguntas.map((p) => ({ respostaId: r.id, perguntaId: p.id, valor: 5 })) });
    }
  }

  // Avaliação do Eixo 2 (o fluxo de tela já é coberto em eixo2.spec.ts).
  await db.avaliacaoEixo2.create({
    data: {
      workspaceId: workspace.id,
      questionarioId: pesquisa.questionarioId,
      nome: "Avaliação Eixo3 E2E",
      status: "CONCLUIDA",
      concluidaEm: new Date(),
      setores: { create: [{ setorId: producao.id }] },
      respostas: {
        create: perguntas.map((p) => ({
          questaoId: p.questaoEixo2!.id,
          setorId: producao.id,
          condicao: p.fatorRisco.dimensao.nome.startsWith("5.") ? "PRECISA_MELHORAR" : "EFICAZ",
        })),
      },
    },
  });

  // ── Eixo 3: publicar a planilha pela tela ──────────────────────────
  await page.getByRole("link", { name: "Eixo 3 · Atestados CID-F" }).click();
  const modelo = await page.request.get("/gestor/eixo3/modelo");
  expect(modelo.headers()["content-type"]).toContain("spreadsheetml");

  await page.getByRole("link", { name: "+ Publicar planilha" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Atestados E2E");
  await page.getByLabel("Período analisado — início").fill("2025-01-01");
  await page.getByLabel("Período analisado — fim").fill("2025-12-31");
  await page.getByRole("button", { name: "Continuar para a planilha" }).click();
  await expect(page.getByRole("heading", { name: "Atestados E2E" })).toBeVisible();

  await page.getByLabel("Planilha de ocorrências (.xlsx)").setInputFiles({
    name: "ocorrencias.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await planilhaOcorrencias([
      ["producao", "F51.2", "Ciclo vigília-sono", "10/03/2025", 5, "Sim", "Escalas noturnas"],
      ["PRODUÇÃO", "F43.1", "TEPT", "12/05/2025", 15, "Não", null],
      ["Galpão Norte", "F41", "Ansiedade", "20/06/2025", 3, "Inconclusivo", null],
    ]),
  });
  await page.getByRole("button", { name: "Enviar planilha" }).click();
  await expect(page.getByText("3 ocorrência(s) importada(s).")).toBeVisible();

  // "producao"/"PRODUÇÃO" associados sozinhos; "Galpão Norte" precisa de decisão.
  await page.getByLabel('Setor para "Galpão Norte"').selectOption({ label: "Administrativo" });
  await expect(page.getByText("Tudo associado.")).toBeVisible();

  await page.getByLabel("Responsável pelo preenchimento (RH/DP)").last().fill("Ana do RH");
  await page.getByRole("checkbox", { name: /Declaro, como responsável/ }).check();
  await page.getByRole("button", { name: "Publicar levantamento" }).click();
  await expect(page.getByRole("button", { name: "Reabrir para editar" })).toBeVisible();

  // Painel do Eixo 3: F51.2 relacionado agrava 2 fatores; F43.1 "Não" não agrava.
  const linhaPainel = page.locator("tr", { hasText: "Produção" }).first();
  await expect(linhaPainel.getByText("2 de 13")).toBeVisible();
  await expect(page.getByText(/1 ocorrência\(s\) com relação/)).toBeVisible(); // inconclusiva
  await expect(page.getByText(/ocorrência\(s\) F43\.1/)).toBeVisible();

  // ── Painel FRPRT ───────────────────────────────────────────────────
  await page.getByRole("link", { name: "Painel FRPRT" }).click();
  const resumo = page.locator("section", { hasText: "1. Painel resumido por setor" });
  const linhaResumo = resumo.locator("tr", { hasText: "Produção" });
  await expect(linhaResumo.getByText("60%")).toBeVisible(); // 6 de 10 colaboradores
  await expect(linhaResumo.getByText("4,10")).toBeVisible();
  await expect(linhaResumo.getByText("257")).toBeVisible();
  await expect(resumo.locator("tr", { hasText: "Administrativo" }).getByText(/Amostra insuficiente/)).toBeVisible();

  // Empate em 100% dos setores: o fator mais grave (Horários, 4,95) vem primeiro.
  const principais = page.locator("section", { hasText: "2. Principais fatores" });
  await expect(principais.locator("span.text-zinc-700").first()).toHaveText("5. Horários e Jornada");

  const matriz = page.locator("section", { hasText: "3. Matriz de decisão" });
  await expect(matriz.locator("tr", { hasText: "5. Horários e Jornada" }).getByText("4,95")).toBeVisible();
  await expect(matriz.locator("tr", { hasText: "10. Equilíbrio Trabalho-Vida" }).getByText("4,40")).toBeVisible();
  await expect(matriz.locator("tr", { hasText: "1. Instrução de Trabalho" }).getByText("4,00").first()).toBeVisible();

  const pgr = page.locator("section", { hasText: "4. Riscos existentes" });
  await expect(pgr.locator("article")).toHaveCount(2);
  await expect(pgr.getByText("Produção · 5. Horários e Jornada")).toBeVisible();
  await expect(pgr.getByText(/Registrados no setor e relacionados ao trabalho: F51\.2/).first()).toBeVisible();

  const pdf = await page.request.get("/gestor/painel/relatorio");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
});

test("Eixo 3: gestor de outra empresa não abre o levantamento alheio", async ({ page }) => {
  const sufixo = Date.now();
  const emailA = `gestor-e3a-${sufixo}@teste.local`;
  const emailB = `gestor-e3b-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa E3 A ${sufixo}`, emailA);
  await criarEmpresa(page, `Empresa E3 B ${sufixo}`, emailB);

  await login(page, emailA, "senhaDoGestor123", /\/gestor$/);
  await page.goto("/gestor/eixo3/novo");
  await page.getByRole("button", { name: "Continuar para a planilha" }).click();
  await expect(page).toHaveURL(/\/gestor\/eixo3\/(?!novo$)[^/]+$/);
  await expect(page.getByText("Planilha de ocorrências")).toBeVisible();
  const url = new URL(page.url()).pathname;

  await login(page, emailB, "senhaDoGestor123", /\/gestor$/);
  expect((await page.goto(url))?.status()).toBe(404);
});
