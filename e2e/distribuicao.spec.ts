import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function login(page: Page, email: string, senha: string, destino: RegExp) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(destino, { timeout: 15_000 });
}

/**
 * Setores: Grande 8 · Médio 5 · Outro 4 · Pequeno 1 (mínimo 3).
 * Pequeno é suprimido e, contra a subtração, o segundo menor (Outro) também:
 * no filtro e no Excel só aparecem Grande e Médio.
 * Grande, pergunta 1: 4 pessoas "Sempre" e 4 "Nunca" → 50% expostos → destaque.
 */
test("distribuição das respostas: contagem por opção, destaque pela metodologia, anonimato e Excel por setor", async ({ page }) => {
  test.setTimeout(120_000);
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Distribuicao E2E ${sufixo}`;
  const gestorEmail = `gestor-dist-${sufixo}@teste.local`;

  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Dist E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const ws = await db.workspace.findFirstOrThrow({ where: { nome: nomeEmpresa } });
  const questionario = await db.questionario.findFirstOrThrow({ where: { ativo: true } });
  const perguntas = await db.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: questionario.id } } } },
    select: { id: true, ordemGlobal: true },
  });
  const pesquisa = await db.pesquisa.create({
    data: {
      workspaceId: ws.id,
      questionarioId: questionario.id,
      nome: "Pesquisa Distribuicao",
      slug: `pesquisa-dist-${sufixo}`,
      dataInicio: new Date(Date.now() - 86_400_000),
      dataFim: new Date(Date.now() + 86_400_000),
      licencasSolicitadas: 30,
    },
  });
  let n = 0;
  for (const [nome, qtd] of [
    ["Grande", 8],
    ["Medio", 5],
    ["Outro", 4],
    ["Pequeno", 1],
  ] as const) {
    const setor = await db.setorOrg.create({ data: { workspaceId: ws.id, nome } });
    for (let i = 0; i < qtd; i++) {
      const codigo = await db.codigoAcesso.create({
        data: { pesquisaId: pesquisa.id, codigo: `DIS${sufixo}${n++}`, tipo: "PARTICIPANTE", status: "CONCLUIDO" },
      });
      await db.resposta.create({
        data: {
          codigoAcessoId: codigo.id,
          setorId: setor.id,
          concluidoEm: new Date(),
          itens: {
            create: perguntas.map((p) => ({
              perguntaId: p.id,
              valor: p.ordemGlobal === 1 && nome === "Grande" ? (i < 4 ? 5 : 1) : 2,
            })),
          },
        },
      });
    }
  }
  // Código de teste concluído nunca entra.
  const teste = await db.codigoAcesso.create({
    data: { pesquisaId: pesquisa.id, codigo: `DIST${sufixo}`, tipo: "TESTE", status: "CONCLUIDO" },
  });
  await db.resposta.create({
    data: { codigoAcessoId: teste.id, concluidoEm: new Date(), itens: { create: perguntas.map((p) => ({ perguntaId: p.id, valor: 5 })) } },
  });

  await page.context().clearCookies();
  await login(page, gestorEmail, "senhaDoGestor123", /\/gestor$/);
  await page.goto(`/gestor/pesquisas/${pesquisa.id}/dashboard`);
  await page.getByRole("link", { name: /Distribuição das respostas/ }).click();
  await expect(page.getByRole("heading", { name: "Distribuição das respostas" })).toBeVisible();
  await expect(page.getByTestId("respondentes")).toContainText("18 respondentes, todos os setores");

  // Filtro: só setores com anonimato garantido.
  const opcoes = await page.getByLabel("Setor").locator("option").allInnerTexts();
  expect(opcoes).toEqual(["Todos os setores", "Grande (8)", "Medio (5)"]);
  await expect(page.getByText(/2 setor\(es\) com menos de 3 respostas não aparecem separados/)).toBeVisible();

  // Pergunta 1 em todos os setores: 4 Sempre, 4 Nunca, 10 Raramente → 4/18 = 22%, sem destaque.
  const fator1 = page.getByRole("region", { name: /^1\. / });
  const linha1 = fator1.locator("tr", { hasText: /^1\./ }).first();
  await expect(linha1).toContainText("22%");
  await expect(linha1).not.toHaveAttribute("data-destaque", "sim");

  await page.getByLabel("Setor").selectOption({ label: "Grande (8)" });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByTestId("respondentes")).toContainText("8 respondentes, Grande");
  const grande1 = page.getByRole("region", { name: /^1\. / }).locator("tr[data-destaque='sim']");
  await expect(grande1).toHaveCount(1);
  await expect(grande1).toContainText("50%");

  // Setor suprimido pela URL não é aceito: volta para "todos".
  const outro = await db.setorOrg.findFirstOrThrow({ where: { workspaceId: ws.id, nome: "Outro" } });
  await page.goto(`/gestor/pesquisas/${pesquisa.id}/dashboard/distribuicao?setor=${outro.id}`);
  await expect(page.getByTestId("respondentes")).toContainText("18 respondentes, todos os setores");

  // Excel: aba "Todos" + uma por setor visível.
  const resp = await page.request.get(`/gestor/pesquisas/${pesquisa.id}/dashboard/distribuicao/excel`);
  expect(resp.status()).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await resp.body()) as never);
  expect(wb.worksheets.map((w) => w.name)).toEqual(["Todos", "Grande", "Medio"]);
  expect(String(wb.getWorksheet("Grande")!.getCell("A1").value)).toBe("8 respondentes, Grande");

  // Gestor de outra empresa não acessa.
  const outraEmpresa = `Empresa Dist B ${sufixo}`;
  const outroGestor = `gestor-dist-b-${sufixo}@teste.local`;
  await page.context().clearCookies();
  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(outraEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor B");
  await page.getByLabel("E-mail", { exact: true }).fill(outroGestor);
  await page.getByLabel("Senha provisória").fill("senhaDoGestor123");
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().clearCookies();
  await login(page, outroGestor, "senhaDoGestor123", /\/gestor$/);
  expect((await page.goto(`/gestor/pesquisas/${pesquisa.id}/dashboard/distribuicao`))?.status()).toBe(404);
  expect((await page.request.get(`/gestor/pesquisas/${pesquisa.id}/dashboard/distribuicao/excel`)).status()).toBe(404);
});

test.afterAll(async () => {
  await db.$disconnect();
});
