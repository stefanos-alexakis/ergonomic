import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

function paraDatetimeLocal(d: Date): string {
  return d.toISOString().slice(0, 16);
}

async function responderTodasAsPaginas(page: Page) {
  // Responde a primeira opção em cada pergunta da página atual e avança,
  // repetindo até a URL cair em "?pagina=revisar". Espera a URL mudar de
  // verdade — "networkidle" não é sinal confiável para navegação
  // client-side do App Router (a URL muda via history API, sem os
  // eventos de carregamento clássicos que networkidle observa).
  for (let seguranca = 0; seguranca < 10; seguranca++) {
    if (page.url().includes("pagina=revisar")) return;

    const urlAntes = page.url();
    // O rádio fica visualmente escondido (sr-only) atrás de um rótulo
    // clicável estilizado — clicar no rótulo é como uma pessoa de
    // verdade interage; clicar no input escondido diretamente esbarra
    // no rótulo por cima e nunca completa (achado no E2E desta fase).
    const rotulosPrimeiraOpcao = page.locator('label:has(input[type="radio"][value="1"])');
    const total = await rotulosPrimeiraOpcao.count();
    for (let i = 0; i < total; i++) {
      await rotulosPrimeiraOpcao.nth(i).click();
    }
    await page.getByRole("button", { name: "Próximo" }).click();
    await page.waitForURL((url) => url.toString() !== urlAntes, { timeout: 15_000 });
  }
  throw new Error("Não chegou à revisão depois de várias páginas — possível loop.");
}

test("jornada completa do colaborador: código → organização → questionário paginado → revisar → concluir", async ({
  browser,
}) => {
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Jornada E2E ${sufixo}`;
  const gestorEmail = `gestor-jornada-${sufixo}@teste.local`;
  const gestorSenha = "senhaDoGestor123";

  const contextoGestor = await browser.newContext();
  const gestorPage = await contextoGestor.newPage();

  // Admin cria a empresa.
  await gestorPage.goto("/login");
  await gestorPage.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await gestorPage.getByLabel("Senha").fill(ADMIN_SENHA);
  await gestorPage.getByRole("button", { name: "Entrar" }).click();
  await expect(gestorPage).toHaveURL(/\/admin$/);

  await gestorPage.goto("/admin/empresas/nova");
  await gestorPage.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await gestorPage.getByLabel("Nome", { exact: true }).fill("Gestor Jornada E2E");
  await gestorPage.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await gestorPage.getByLabel("Senha provisória").fill(gestorSenha);
  await gestorPage.getByRole("button", { name: "Criar empresa" }).click();
  await expect(gestorPage).toHaveURL(/\/admin$/);

  // Gestor entra, cadastra setor/departamento e cria a pesquisa ABERTA agora.
  await gestorPage.context().clearCookies();
  await gestorPage.goto("/login");
  await gestorPage.getByLabel("E-mail").fill(gestorEmail);
  await gestorPage.getByLabel("Senha").fill(gestorSenha);
  await gestorPage.getByRole("button", { name: "Entrar" }).click();
  await expect(gestorPage).toHaveURL(/\/gestor$/);

  await gestorPage.getByRole("link", { name: "Setores e funções" }).click();
  const inputSetor = gestorPage.locator('form:has(input[value="setor"]) input[name="nome"]');
  await inputSetor.fill("Setor Jornada E2E");
  await inputSetor.press("Enter");
  const inputDepto = gestorPage.locator('form:has(input[value="departamento"]) input[name="nome"]');
  await inputDepto.fill("Depto Jornada E2E");
  await inputDepto.press("Enter");
  await expect(gestorPage.getByText("Setor Jornada E2E")).toBeVisible();

  await gestorPage.goto("/gestor");
  const agora = new Date();
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const proximoMes = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

  await gestorPage.getByRole("link", { name: "+ Nova pesquisa" }).click();
  await gestorPage.getByLabel("Nome da pesquisa").fill("Pesquisa Jornada E2E");
  await gestorPage.getByLabel("Quantidade de licenças").fill("3");
  await gestorPage.getByLabel("Início").fill(paraDatetimeLocal(ontem));
  await gestorPage.getByLabel("Encerramento").fill(paraDatetimeLocal(proximoMes));
  await gestorPage.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(gestorPage).toHaveURL(/\/gestor$/);

  await gestorPage.getByRole("link", { name: "Pesquisa Jornada E2E" }).click();
  await gestorPage.getByRole("button", { name: "Gerar licenças e códigos de acesso" }).click();
  await expect(gestorPage.getByText(/códigos de participante/)).toBeVisible();

  const linhasParticipante = gestorPage.locator("tr", { hasText: "PARTICIPANTE" });
  const codigoParticipante = await linhasParticipante.first().locator("code").innerText();
  const codigoParticipante2 = await linhasParticipante.nth(1).locator("code").innerText();

  await gestorPage.close();

  // ── Agora o colaborador, em navegador/contexto totalmente separado ──
  const contextoColaborador = await browser.newContext();
  const page = await contextoColaborador.newPage();

  // A tela do gestor não mostra o slug (só o nome), então reconstruímos o
  // slug pela mesma regra que o servidor usa (gerarSlug) a partir dos
  // nomes conhecidos — a URL pública é sempre /p/<workspaceSlug>/<pesquisaSlug>.
  const slugify = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const workspaceSlug = slugify(nomeEmpresa);
  const pesquisaSlug = slugify("Pesquisa Jornada E2E");
  const urlPublica = `/p/${workspaceSlug}/${pesquisaSlug}`;

  // Acessa com o código na URL (como o QR faria) e confere que ele SAI da URL.
  await page.goto(`${urlPublica}?codigo=${codigoParticipante}`);
  await page.waitForURL((url) => !url.search.includes("codigo"));
  expect(page.url()).not.toContain("codigo=");

  // Auto-envio do código deve levar direto para a seleção de organização.
  await expect(page.getByRole("heading", { name: "Onde você trabalha" })).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Setor").selectOption({ label: "Setor Jornada E2E" });
  await page.getByLabel("Departamento").selectOption({ label: "Depto Jornada E2E" });
  await page.getByText("Prefiro não informar o segmento").click();
  await page.getByText("Prefiro não informar a função").click();
  await page.getByRole("button", { name: "Continuar para o questionário" }).click();

  await expect(page.getByText(/Página 1 de/)).toBeVisible();
  await responderTodasAsPaginas(page);

  await expect(page.getByRole("heading", { name: "Revisar suas respostas" })).toBeVisible();
  // As seções vêm recolhidas por padrão (review.md §3.5) — abre a primeira
  // para confirmar que a resposta salva aparece. O acordeão é um botão
  // customizado (não mais <details>/<summary> nativo, ver review.md sobre
  // o polimento de interação aplicado à revisão).
  await page.locator('[aria-expanded="false"]').first().click();
  await expect(page.getByText("Não/Nunca").first()).toBeVisible();

  await page.getByRole("button", { name: "Concluir a pesquisa" }).click();
  await expect(page.getByRole("heading", { name: "Obrigado por participar!" })).toBeVisible();

  // O link "nu" (sem ?pagina=) SEMPRE volta a pedir o código — mesmo
  // para quem acabou de concluir — porque é o mesmo link para todo
  // mundo da pesquisa; confiar num cookie de sessão aqui faria a
  // PRÓXIMA pessoa a abrir esse link no mesmo aparelho herdar a sessão
  // de quem respondeu antes (bug real relatado pelo usuário).
  await page.goto(urlPublica);
  await expect(page.getByRole("heading", { name: "Acessar a pesquisa" })).toBeVisible();

  // Só ao digitar o código de novo é que o sistema confere que ele já
  // foi usado — idempotente, mostra "Obrigado" de novo, não reabre o
  // questionário.
  await page.getByLabel("Código de acesso").fill(codigoParticipante);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Obrigado por participar!" })).toBeVisible();

  // Reabrir num navegador "novo" com o MESMO código (sem cookie) deve
  // reconhecer que já foi concluído, não reabrir o questionário.
  const outroContexto = await browser.newContext();
  const outraPage = await outroContexto.newPage();
  await outraPage.goto(`${urlPublica}?codigo=${codigoParticipante}`);
  await expect(outraPage.getByRole("heading", { name: "Obrigado por participar!" })).toBeVisible({
    timeout: 10_000,
  });
  await outroContexto.close();

  // Reprodução exata do bug relatado: MESMO aparelho/navegador (mesmos
  // cookies de quem já concluiu), abrindo o MESMO link compartilhado,
  // mas digitando o código de OUTRO colaborador. Tinha que dar uma
  // pesquisa em branco pra essa pessoa — não "já respondida".
  await page.goto(urlPublica);
  await expect(page.getByRole("heading", { name: "Acessar a pesquisa" })).toBeVisible();
  await page.getByLabel("Código de acesso").fill(codigoParticipante2);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Onde você trabalha" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Obrigado por participar!" })).not.toBeVisible();

  await contextoColaborador.close();
});
