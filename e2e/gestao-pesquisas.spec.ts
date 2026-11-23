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

async function novaPesquisa(page: Page, nome: string, inicio: string, fim: string) {
  await page.goto("/gestor/pesquisas/nova");
  await page.getByLabel("Nome da pesquisa").fill(nome);
  await page.getByLabel("Quantidade de licenças").fill("3");
  await page.getByLabel("Início").fill(inicio);
  await page.getByLabel("Encerramento").fill(fim);
  await page.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
}

async function gerarCodigos(page: Page, nome: string) {
  await page.goto("/gestor?aba=todas");
  await page.getByRole("link", { name: nome, exact: true }).click();
  await page.getByRole("button", { name: "Gerar licenças e códigos de acesso" }).click();
  await expect(page.getByText(/códigos de participante/)).toBeVisible();
}

function gerenciar(page: Page, nome: string) {
  return (async () => {
    await page.goto("/gestor?aba=todas");
    await page.getByRole("link", { name: nome, exact: true }).click();
    await page.getByRole("link", { name: "Prorrogar, arquivar ou excluir" }).click();
    await expect(page.getByRole("heading", { name: "Gerenciar pesquisa" })).toBeVisible();
  })();
}

const dataLocal = (ms: number) => {
  const d = new Date(Date.now() + ms);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
};

test("pesquisas do Eixo 1: abas, prorrogar, arquivar, excluir direto e pedido com carência de 30 dias", async ({ page }) => {
  test.setTimeout(240_000);
  const sufixo = Date.now();
  const empresa = `Empresa Gestao E2E ${sufixo}`;
  const email = `gestor-gestao-${sufixo}@teste.local`;
  await criarEmpresa(page, empresa, email);
  await login(page, email, "senhaDoGestor123", /\/gestor$/);

  // Três pesquisas: A (aberta), B (aberta, vai ser arquivada), C (já encerrada).
  await novaPesquisa(page, "Pesquisa A", dataLocal(-DIA), dataLocal(30 * DIA));
  await novaPesquisa(page, "Pesquisa B", dataLocal(-DIA), dataLocal(30 * DIA));
  await novaPesquisa(page, "Pesquisa C", dataLocal(-40 * DIA), dataLocal(-10 * DIA));

  // ── Abas: Abertas (A, B) · Concluídas (C) ──
  await page.goto("/gestor");
  const abas = page.getByRole("navigation", { name: "Filtrar pesquisas" });
  await expect(abas.getByRole("link", { name: /Abertas/ })).toContainText("2");
  await expect(abas.getByRole("link", { name: /Concluídas/ })).toContainText("1");
  await expect(abas.getByRole("link", { name: /Arquivadas/ })).toContainText("0");
  await expect(page.getByRole("link", { name: "Pesquisa A", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pesquisa C", exact: true })).toHaveCount(0);
  await abas.getByRole("link", { name: /Concluídas/ }).click();
  await expect(page.getByRole("link", { name: "Pesquisa C", exact: true })).toBeVisible();

  // ── Prorrogar C: volta para Abertas ──
  await gerenciar(page, "Pesquisa C");
  await page.getByLabel("Encerramento").fill(dataLocal(15 * DIA));
  await page.getByRole("button", { name: "Salvar encerramento" }).click();
  await expect(page.getByText("Encerramento atualizado.")).toBeVisible();
  await page.goto("/gestor");
  await expect(page.getByRole("link", { name: "Pesquisa C", exact: true })).toBeVisible();

  // ── Arquivar B: sai de Abertas, aparece em Arquivadas, e não aceita mais respostas ──
  await gerarCodigos(page, "Pesquisa B");
  const codigoB = (await db.codigoAcesso.findFirstOrThrow({ where: { pesquisa: { nome: "Pesquisa B", workspace: { nome: empresa } }, tipo: "PARTICIPANTE" } })).codigo;
  await gerenciar(page, "Pesquisa B");
  await page.getByRole("button", { name: "Arquivar pesquisa" }).click();
  await expect(page.getByText("Pesquisa arquivada.")).toBeVisible();
  await page.goto("/gestor");
  await expect(page.getByRole("link", { name: "Pesquisa B", exact: true })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Filtrar pesquisas" }).getByRole("link", { name: /Arquivadas/ }).click();
  await expect(page.getByRole("link", { name: "Pesquisa B", exact: true })).toBeVisible();
  const pB = await db.pesquisa.findFirstOrThrow({ where: { nome: "Pesquisa B", workspace: { nome: empresa } } });
  const colab = await page.context().browser()!.newContext();
  const pc = await colab.newPage();
  await pc.goto(`/p/${(await db.workspace.findFirstOrThrow({ where: { nome: empresa } })).slug}/${pB.slug}`);
  await pc.getByLabel("Código de acesso").fill(codigoB);
  await pc.getByRole("button", { name: "Continuar" }).click();
  await expect(pc.getByText(/encerrada/i)).toBeVisible();
  await colab.close();

  // ── Excluir direto: A tem códigos gerados, mas nenhum usado ──
  await gerarCodigos(page, "Pesquisa A");
  await gerenciar(page, "Pesquisa A");
  await page.getByRole("button", { name: "Excluir pesquisa" }).click();
  await page.getByRole("button", { name: "Sim, excluir" }).click();
  await expect(page).toHaveURL(/\/gestor$/);
  await expect(page.getByRole("link", { name: "Pesquisa A", exact: true })).toHaveCount(0);
  expect(await db.pesquisa.count({ where: { nome: "Pesquisa A", workspace: { nome: empresa } } })).toBe(0);

  // ── Pesquisa iniciada (um código usado): pedido de exclusão com carência ──
  await gerarCodigos(page, "Pesquisa C");
  const pC = await db.pesquisa.findFirstOrThrow({ where: { nome: "Pesquisa C", workspace: { nome: empresa } } });
  const usado = await db.codigoAcesso.findFirstOrThrow({ where: { pesquisaId: pC.id, tipo: "PARTICIPANTE" } });
  await db.codigoAcesso.update({ where: { id: usado.id }, data: { status: "INICIADO" } });
  // Prorrogar continua permitido; antecipar não.
  await gerenciar(page, "Pesquisa C");
  await page.getByLabel("Encerramento").fill(dataLocal(-DIA));
  await page.getByRole("button", { name: "Salvar encerramento" }).click();
  await expect(page.getByText(/só pode ser prorrogado/).last()).toBeVisible();

  await expect(page.getByText("não será excluída imediatamente")).toBeVisible();
  const solicitar = page.getByRole("button", { name: "Solicitar exclusão" });
  await expect(solicitar).toBeDisabled(); // sem digitar o nome
  await page.getByLabel(/digite o nome da pesquisa/).fill("Pesquisa C");
  await solicitar.click();
  // A tela passa a mostrar o estado "exclusão solicitada" (o formulário some).
  await expect(page.getByTestId("exclusao-solicitada")).toContainText("não foi excluída");
  await expect(page.getByTestId("exclusao-prazo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir definitivamente" })).toHaveCount(0);
  const pedido = await db.pesquisa.findUniqueOrThrow({ where: { id: pC.id } });
  expect(pedido.exclusaoSolicitadaEm).not.toBeNull();
  expect(pedido.arquivadaEm).not.toBeNull();
  await page.goto("/gestor?aba=arquivadas");
  await expect(page.getByText("Exclusão solicitada")).toBeVisible();

  // 31 dias depois: libera a exclusão definitiva, com a segunda confirmação por escrito.
  await db.pesquisa.update({ where: { id: pC.id }, data: { exclusaoSolicitadaEm: new Date(Date.now() - 31 * DIA) } });
  await gerenciar(page, "Pesquisa C");
  const definitiva = page.getByRole("button", { name: "Excluir definitivamente" });
  await expect(definitiva).toBeDisabled();
  await page.getByLabel(/digite o nome da pesquisa/).fill("Pesquisa C");
  await definitiva.click();
  await expect(page).toHaveURL(/\/gestor$/);
  expect(await db.pesquisa.count({ where: { id: pC.id } })).toBe(0);
  expect(await db.codigoAcesso.count({ where: { pesquisaId: pC.id } })).toBe(0);
});

test("admin: filtro por parte do nome na lista de empresas", async ({ page }) => {
  test.setTimeout(120_000);
  const sufixo = Date.now();
  const nomeA = `Filtro Alfa ${sufixo}`;
  const nomeB = `Filtro Beta ${sufixo}`;
  await criarEmpresa(page, nomeA, `filtro-a-${sufixo}@teste.local`);
  await criarEmpresa(page, nomeB, `filtro-b-${sufixo}@teste.local`);

  await page.goto("/admin");
  await page.getByLabel("Buscar empresa pelo nome").fill(`alfa ${sufixo}`);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("link", { name: nomeA })).toBeVisible();
  await expect(page.getByRole("link", { name: nomeB })).toHaveCount(0);
  await expect(page.getByTestId("contagem-empresas")).toContainText("1 de");

  await page.getByLabel("Buscar empresa pelo nome").fill("zzz-nao-existe");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByTestId("sem-resultado-empresas")).toBeVisible();

  await page.getByRole("link", { name: "Limpar" }).click();
  await expect(page.getByRole("link", { name: nomeA })).toBeVisible();
});
