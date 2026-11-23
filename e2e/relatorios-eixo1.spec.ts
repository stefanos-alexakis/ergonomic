import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const DIA = 24 * 60 * 60 * 1000;

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

test("relatórios do Eixo 1: lista com link só para painéis disponíveis; arquivadas e excluídas não aparecem", async ({ page }) => {
  test.setTimeout(180_000);
  const sufixo = Date.now();
  const empresa = `Empresa Relatorios E1 ${sufixo}`;
  const email = `gestor-rel1-${sufixo}@teste.local`;
  const outraEmail = `gestor-rel1-b-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa Outra Rel ${sufixo}`, outraEmail);
  await criarEmpresa(page, empresa, email);

  const ws = await db.workspace.findFirstOrThrow({ where: { nome: empresa } });
  const questionario = await db.questionario.findFirstOrThrow({ where: { ativo: true } });
  const criar = async (nome: string, extra: object, concluidas: number, codigos: number) => {
    const p = await db.pesquisa.create({
      data: {
        workspaceId: ws.id,
        questionarioId: questionario.id,
        nome,
        slug: `rel1-${nome.toLowerCase().replace(/\W+/g, "-")}-${sufixo}`,
        dataInicio: new Date(Date.now() - 10 * DIA),
        dataFim: new Date(Date.now() + 10 * DIA),
        licencasSolicitadas: codigos,
        ...extra,
      },
    });
    for (let i = 0; i < codigos; i++) {
      await db.codigoAcesso.create({
        data: { pesquisaId: p.id, codigo: `R1${nome.slice(0, 2)}${sufixo}${i}`.toUpperCase(), tipo: "PARTICIPANTE", status: i < concluidas ? "CONCLUIDO" : "DISPONIVEL" },
      });
    }
    return p;
  };
  const comPainel = await criar("Com painel", {}, 4, 6);
  await criar("Aguardando", {}, 1, 5);
  await criar("Arquivada", { arquivadaEm: new Date() }, 4, 4);
  await criar("Excluida", { arquivadaEm: new Date(), exclusaoSolicitadaEm: new Date() }, 4, 4);
  // Códigos de teste não contam como respostas.
  const teste = await db.pesquisa.findFirstOrThrow({ where: { workspaceId: ws.id, nome: "Aguardando" } });
  for (let i = 0; i < 5; i++) {
    await db.codigoAcesso.create({ data: { pesquisaId: teste.id, codigo: `TST${sufixo}${i}`, tipo: "TESTE", status: "CONCLUIDO" } });
  }

  await login(page, email, "senhaDoGestor123", /\/gestor$/);

  // Atalhos: botão na tela do Eixo 1 e item no menu lateral.
  await page.getByRole("link", { name: "Ver todos os relatórios" }).click();
  await expect(page.getByRole("heading", { name: "Relatórios Eixo 1 · Pesquisas Colaboradores" })).toBeVisible();
  await page.goto("/gestor");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("link", { name: "Relatórios Eixo 1" }).click();
  await expect(page).toHaveURL(/\/gestor\/relatorios-eixo1$/);

  // Só as duas pesquisas ativas, mais recente primeiro.
  const linhas = page.getByTestId("linha-relatorio");
  await expect(linhas).toHaveCount(2);
  await expect(page.getByText("Arquivada")).toHaveCount(0);
  await expect(page.getByText("Excluida")).toHaveCount(0);
  await expect(linhas.nth(0)).toContainText("Aguardando");
  await expect(linhas.nth(1)).toContainText("Com painel");

  // Com painel: respostas concluídas de participantes, status e link.
  const linhaPainel = page.locator("tr", { hasText: "Com painel" });
  await expect(linhaPainel).toContainText("4 de 6");
  await expect(linhaPainel).toContainText("Aberta");
  await expect(linhaPainel).toContainText(/\d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}/);

  // Aguardando: aparece, sem link (os 5 códigos de teste não contam).
  const linhaEspera = page.locator("tr", { hasText: "Aguardando" });
  await expect(linhaEspera).toContainText("1 de 5");
  await expect(linhaEspera.getByTestId("aguardando-respostas")).toHaveText("Aguardando respostas");
  await expect(linhaEspera.getByRole("link")).toHaveCount(0);

  // O link leva ao painel da própria pesquisa.
  await linhaPainel.getByRole("link", { name: "Abrir painel" }).click();
  await expect(page).toHaveURL(new RegExp(`/gestor/pesquisas/${comPainel.id}/dashboard$`));
  await expect(page.getByRole("heading", { name: "Painel" })).toBeVisible();

  // Outra empresa não enxerga estas pesquisas.
  await login(page, outraEmail, "senhaDoGestor123", /\/gestor$/);
  await page.goto("/gestor/relatorios-eixo1");
  await expect(page.getByTestId("lista-vazia")).toBeVisible();
  await expect(page.getByText("Com painel")).toHaveCount(0);
});
