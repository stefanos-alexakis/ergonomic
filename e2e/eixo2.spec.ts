import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

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

test("Eixo 2: confirma setores, responde para todos, abre exceção por setor, plano de ação e resultado", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const sufixo = Date.now();
  const gestorEmail = `gestor-eixo2-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa Eixo2 E2E ${sufixo}`, gestorEmail);
  await login(page, gestorEmail, "senhaDoGestor123", /\/gestor$/);

  // Dois setores cadastrados pelo caminho normal.
  await page.goto("/gestor/estrutura");
  const inputSetor = page.locator('form:has(input[value="setor"]) input[name="nome"]');
  for (const nome of ["Setor A E2E", "Setor B E2E"]) {
    await inputSetor.fill(nome);
    await inputSetor.press("Enter");
    await expect(page.getByText(nome)).toBeVisible();
  }

  // Nova avaliação: setores listados e marcados; um terceiro criado na própria tela.
  await page.getByRole("link", { name: "Eixo 2 · Medidas de controle" }).click();
  await page.getByRole("link", { name: "+ Nova avaliação" }).click();
  await expect(page.getByLabel("Setor A E2E")).toBeChecked();
  await expect(page.getByLabel("Setor B E2E")).toBeChecked();
  await page.getByLabel("Nome do novo setor").fill("Setor C E2E");
  await page.getByRole("button", { name: "+ Adicionar" }).click();
  await expect(page.getByLabel("Setor C E2E")).toBeChecked();
  await page.getByLabel("Nome da avaliação").fill("Avaliação E2E");
  await page.getByRole("button", { name: "Criar e começar a responder" }).click();
  await expect(page.getByRole("heading", { name: "Avaliação E2E" })).toBeVisible();

  // Etapa 1: exceção no Setor B na primeira pergunta, com plano de ação sugerido.
  const primeira = page.locator("article").first();
  await primeira.getByText("Existente e eficaz").click();
  await expect(primeira.getByText("Salvo")).toBeVisible();
  await primeira.getByRole("switch").uncheck();
  const linhaB = primeira.locator("div.rounded-md", { hasText: "Setor B E2E" });
  await linhaB.getByText("Inexistente").click();
  await expect(primeira.getByText("Salvo")).toBeVisible();
  await linhaB.getByRole("button", { name: "+ Adicionar plano de ação" }).click();
  const plano = linhaB.getByLabel("Plano de ação");
  await expect(plano).toHaveValue(/Descrições de cargo de forma clara/);
  await plano.fill(`${await plano.inputValue()}\n- Revisar em 30 dias`);
  await plano.blur();
  await expect(primeira.getByText("Salvo")).toBeVisible();

  // Todas as demais perguntas: uma resposta só, gravada nos 3 setores.
  for (let etapa = 1; etapa <= 13; etapa++) {
    const cartoes = page.locator("article");
    const n = await cartoes.count();
    for (let i = etapa === 1 ? 1 : 0; i < n; i++) {
      const cartao = cartoes.nth(i);
      await cartao.getByText("Existente e eficaz").click();
      await expect(cartao.getByText("Salvo")).toBeVisible();
    }
    if (etapa < 13) {
      await page.getByRole("link", { name: "Próxima dimensão →" }).click();
      await expect(page).toHaveURL(new RegExp(`etapa=${etapa + 1}`));
    }
  }
  await expect(page.getByText("35 de 35 perguntas respondidas")).toBeVisible();

  // Sem confirmar a revisão dos sinais (ISO 45003) não dá para concluir.
  await expect(page.getByText("Falta confirmar a revisão dos sinais de exposição.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Concluir avaliação" })).toHaveCount(0);

  // Etapa 14 — sinais de exposição: padrão "Nunca"; só o setor que identifica abre a escala.
  await page.getByRole("link", { name: "Próxima etapa: sinais (ISO 45003) →" }).click();
  await expect(page.getByRole("heading", { name: "Sinais de exposição (ISO 45003)" })).toBeVisible();
  const primeiroSinal = page.locator("article").first();
  await expect(primeiroSinal.getByRole("radio")).toHaveCount(0); // nada aberto por padrão
  const sinalSetorB = primeiroSinal.locator("li", { hasText: "Setor B E2E" });
  await sinalSetorB.getByLabel(/Sinal identificado/).check();
  await sinalSetorB.getByText("Frequentemente", { exact: true }).click();
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();
  // Setor A segue em "Nunca": sem escala aberta.
  await expect(primeiroSinal.locator("li", { hasText: "Setor A E2E" }).getByRole("radio")).toHaveCount(0);
  await page.getByRole("button", { name: "Confirmo a revisão dos sinais" }).click();
  await expect(page.getByTestId("sinais-revisados")).toBeVisible();

  await page.getByRole("link", { name: "Revisar e concluir →" }).click();
  await page.getByLabel("Responsável pela entrevista / avaliação").fill("Consultora E2E");
  await page.getByRole("button", { name: "Concluir avaliação" }).click();
  await expect(page.getByRole("heading", { name: "Resultado das medidas de controle" })).toBeVisible();

  // Setor B: dimensão 1 com (1,00 + 0,80 + 0,80) ÷ 3 = ×0,87 (Regular); demais ×0,80.
  const linhaInstrucao = page.locator("tr", { hasText: "1. Instrução de Trabalho" });
  await expect(linhaInstrucao.getByText("×0,87")).toHaveCount(1);
  await expect(linhaInstrucao.getByText("×0,80")).toHaveCount(2);
  await expect(page.getByText("- Revisar em 30 dias")).toBeVisible();

  // Sinais de exposição no resultado: Setor B com "Frequentemente" no 1º sinal; fora do índice.
  const matriz = page.getByTestId("matriz-sinais");
  await expect(matriz.locator('td[data-valor="4"]')).toHaveCount(1);
  await expect(matriz.locator("tfoot")).toContainText("1 de 9");
  await expect(page.getByTestId("sinais-nao-revisados")).toHaveCount(0);

  // Reabrir para corrigir e concluir já da 1ª etapa, sem percorrer as 13
  // (sugestão do usuário depois de testar).
  await page.getByRole("link", { name: "Ver respostas" }).click();
  await page.getByRole("button", { name: "Reabrir para editar" }).click();
  await expect(page).toHaveURL(/\/gestor\/eixo2\/[^/?]+$/);
  await page.locator("article").nth(1).getByText("Existente, precisa melhorar").click();
  await expect(page.locator("article").nth(1).getByText("Salvo")).toBeVisible();
  await page.getByRole("button", { name: "Concluir avaliação" }).first().click();
  await expect(page.getByRole("heading", { name: "Resultado das medidas de controle" })).toBeVisible();
});

test("Eixo 2: gestor de outra empresa não abre avaliação alheia", async ({ page }) => {
  const sufixo = Date.now();
  const emailA = `gestor-eixo2a-${sufixo}@teste.local`;
  const emailB = `gestor-eixo2b-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa Eixo2 A ${sufixo}`, emailA);
  await criarEmpresa(page, `Empresa Eixo2 B ${sufixo}`, emailB);

  await login(page, emailA, "senhaDoGestor123", /\/gestor$/);
  await page.goto("/gestor/eixo2/nova");
  await page.getByLabel("Nome do novo setor").fill("Setor Único");
  await page.getByRole("button", { name: "+ Adicionar" }).click();
  await expect(page.getByLabel("Setor Único")).toBeChecked();
  await page.getByRole("button", { name: "Criar e começar a responder" }).click();
  // Espera sair de /nova (a regex sozinha casava com a própria /nova).
  await expect(page).toHaveURL(/\/gestor\/eixo2\/(?!nova$)[^/]+$/);
  await expect(page.getByText(/perguntas respondidas em todos os setores/)).toBeVisible();
  const urlAvaliacao = new URL(page.url()).pathname;

  await login(page, emailB, "senhaDoGestor123", /\/gestor$/);
  const resposta = await page.goto(urlAvaliacao);
  expect(resposta?.status()).toBe(404);
  const resultado = await page.goto(`${urlAvaliacao}/resultado`);
  expect(resultado?.status()).toBe(404);
});
