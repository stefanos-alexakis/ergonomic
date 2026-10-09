import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const VIDEO = "dQw4w9WgXcQ";
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function login(page: Page, email: string, senha: string, destino: RegExp) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(destino, { timeout: 15_000 });
}

async function responderQuestionario(page: Page) {
  for (let i = 0; i < 12; i++) {
    const rotulos = page.locator('label:has(input[type="radio"][value="3"])');
    for (let j = 0; j < (await rotulos.count()); j++) await rotulos.nth(j).click();
    const concluir = page.getByRole("button", { name: "Concluir a pesquisa" });
    if (await concluir.isVisible()) return concluir.click();
    const antes = page.url();
    await page.getByRole("button", { name: "Próximo" }).click();
    await page.waitForURL((u) => u.toString() !== antes, { timeout: 15_000 });
  }
  throw new Error("questionário não terminou");
}

test("vídeo + texto de orientação e pré-pesquisa: colaborador responde ou pula; gestor vê só o total; admin vê o cruzamento", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa PrePesquisa E2E ${sufixo}`;
  const gestorEmail = `gestor-pre-${sufixo}@teste.local`;
  const gestorSenha = "senhaDoGestor123";
  const nomePesquisa = "Pesquisa PrePesquisa E2E";

  const g = await (await browser.newContext()).newPage();
  await login(g, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await g.goto("/admin/empresas/nova");
  await g.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await g.getByLabel("Nome", { exact: true }).fill("Gestor Pre E2E");
  await g.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await g.getByLabel("Senha provisória").fill(gestorSenha);
  await g.getByRole("button", { name: "Criar empresa" }).click();
  await expect(g).toHaveURL(/\/admin$/);

  await g.context().clearCookies();
  await login(g, gestorEmail, gestorSenha, /\/gestor$/);
  await g.getByRole("link", { name: "Setores e departamentos" }).click();
  const inputSetor = g.locator('form:has(input[value="setor"]) input[name="nome"]');
  await inputSetor.fill("Setor Pre E2E");
  await inputSetor.press("Enter");
  const inputDepto = g.locator('form:has(input[value="departamento"]) input[name="nome"]');
  await inputDepto.fill("Depto Pre E2E");
  await inputDepto.press("Enter");
  await expect(g.getByText("Depto Pre E2E")).toBeVisible();

  const agora = Date.now();
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 16);
  await g.goto("/gestor/pesquisas/nova");
  await g.getByLabel("Nome da pesquisa").fill(nomePesquisa);
  await g.getByLabel("Quantidade de licenças").fill("5");
  await g.getByLabel("Início").fill(fmt(agora - 86_400_000));
  await g.getByLabel("Encerramento").fill(fmt(agora + 30 * 86_400_000));
  // Link de outro site é recusado.
  await g.getByLabel("Vídeo orientativo (link do YouTube)").fill("https://vimeo.com/123");
  await g.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(g.getByText(/Link do vídeo inválido/)).toBeVisible();
  await g.getByLabel("Vídeo orientativo (link do YouTube)").fill(`https://www.youtube.com/watch?v=${VIDEO}&t=10s`);
  await g.getByLabel("Texto de orientação").fill("Leia com calma.\nSuas respostas são anônimas.");
  await g.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(g).toHaveURL(/\/gestor$/);

  // Pré-pesquisa ligada depois, pela tela de edição.
  await g.getByRole("link", { name: nomePesquisa }).click();
  await expect(g.getByText("Pré-pesquisa: não exibida")).toBeVisible();
  await g.getByRole("link", { name: "Editar orientação e pré-pesquisa" }).click();
  await expect(g.getByLabel("Vídeo orientativo (link do YouTube)")).toHaveValue(`https://youtu.be/${VIDEO}`);
  await g.getByLabel(/Exibir a pré-pesquisa/).check();
  await g.getByRole("button", { name: "Salvar" }).click();
  await expect(g.getByText("Pré-pesquisa: exibida")).toBeVisible();

  await g.getByRole("button", { name: "Gerar licenças e códigos de acesso" }).click();
  const linhas = g.locator("tr", { hasText: "PARTICIPANTE" });
  await expect(linhas.first()).toBeVisible();
  const codigo1 = await linhas.nth(0).locator("code").innerText();
  const codigo2 = await linhas.nth(1).locator("code").innerText();

  const url = `/p/${slugify(nomeEmpresa)}/${slugify(nomePesquisa)}`;

  // Colaborador 1: vê vídeo e texto, responde a pré-pesquisa.
  const c1 = await (await browser.newContext()).newPage();
  await c1.goto(`${url}?codigo=${codigo1}`);
  await expect(c1.getByRole("heading", { name: "Onde você trabalha" })).toBeVisible({ timeout: 15_000 });
  await expect(c1.locator("iframe")).toHaveAttribute("src", `https://www.youtube-nocookie.com/embed/${VIDEO}?rel=0`);
  await expect(c1.getByText("Suas respostas são anônimas.")).toBeVisible();
  await c1.getByLabel("Setor").selectOption({ label: "Setor Pre E2E" });
  await c1.getByLabel("Departamento").selectOption({ label: "Depto Pre E2E" });
  await c1.getByRole("button", { name: "Continuar para o questionário" }).click();
  await expect(c1.getByRole("heading", { name: /Pra gente conhecer/ })).toBeVisible();
  await c1.getByRole("group", { name: /Sexo/ }).getByLabel("Feminino").check();
  await c1.getByRole("group", { name: /bebidas alcoólicas/ }).getByLabel("Raramente").check();
  await c1.getByRole("button", { name: "Continuar para o questionário" }).click();
  await expect(c1.getByText(/Página 1 de/)).toBeVisible();
  // Voltar ao link do fluxo não reabre a pré-pesquisa.
  await c1.goto(`${url}?pagina=1`);
  await expect(c1.getByText(/Página 1 de/)).toBeVisible();
  await responderQuestionario(c1);
  await expect(c1.getByRole("heading", { name: "Obrigado por participar!" })).toBeVisible();

  // Colaborador 2: pula a pré-pesquisa.
  const c2 = await (await browser.newContext()).newPage();
  await c2.goto(`${url}?codigo=${codigo2}`);
  await expect(c2.getByRole("heading", { name: "Onde você trabalha" })).toBeVisible({ timeout: 15_000 });
  await c2.getByLabel("Setor").selectOption({ label: "Setor Pre E2E" });
  await c2.getByLabel("Departamento").selectOption({ label: "Depto Pre E2E" });
  await c2.getByRole("button", { name: "Continuar para o questionário" }).click();
  await c2.getByRole("button", { name: "Prefiro pular esta etapa" }).click();
  await expect(c2.getByText(/Página 1 de/)).toBeVisible();
  await responderQuestionario(c2);
  await expect(c2.getByRole("heading", { name: "Obrigado por participar!" })).toBeVisible();

  const pesquisa = await db.pesquisa.findFirstOrThrow({ where: { nome: nomePesquisa, workspace: { nome: nomeEmpresa } } });
  expect(pesquisa.videoYoutubeId).toBe(VIDEO);
  const gravadas = await db.respostaPrePesquisa.findMany({ where: { pesquisaId: pesquisa.id } });
  expect(gravadas).toHaveLength(1);
  expect(gravadas[0]).toMatchObject({ sexo: "FEMININO", alcool: "RARAMENTE", faixaIdade: null });
  expect(await db.resposta.count({ where: { codigoAcesso: { pesquisaId: pesquisa.id }, prePesquisaVista: true } })).toBe(2);

  // Gestor: com só 1 pré-pesquisa, perfil oculto (mínimo de 3).
  await g.goto(`/gestor/pesquisas/${pesquisa.id}/dashboard`);
  await expect(g.getByText(/Menos de 3 pré-pesquisas respondidas/)).toBeVisible();

  // Mais 2 respostas concluídas com pré-pesquisa, direto no banco.
  const setor = await db.setorOrg.findFirstOrThrow({ where: { workspace: { nome: nomeEmpresa } } });
  const perguntas = await db.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: pesquisa.questionarioId } } } },
    select: { id: true },
  });
  const livres = await db.codigoAcesso.findMany({
    where: { pesquisaId: pesquisa.id, tipo: "PARTICIPANTE", status: "DISPONIVEL" },
    take: 2,
  });
  for (const c of livres) {
    await db.codigoAcesso.update({ where: { id: c.id }, data: { status: "CONCLUIDO" } });
    await db.resposta.create({
      data: {
        codigoAcessoId: c.id,
        setorId: setor.id,
        concluidoEm: new Date(),
        prePesquisaVista: true,
        itens: { create: perguntas.map((p) => ({ perguntaId: p.id, valor: 4 })) },
        prePesquisa: { create: { pesquisaId: pesquisa.id, sexo: "FEMININO", alcool: "SEMANA" } },
      },
    });
  }

  await g.reload();
  const perfil = g.getByRole("region", { name: "Perfil dos participantes" });
  await expect(perfil.getByText(/3 de 4 participante\(s\) responderam/)).toBeVisible();
  await expect(perfil.locator("li", { hasText: "Feminino" })).toContainText("3 · 100%");
  // Gestor não vê setor no perfil, nem a tela de cruzamento.
  await expect(perfil.getByText("Setor Pre E2E")).toHaveCount(0);
  await g.goto("/admin/pre-pesquisa");
  await expect(g).not.toHaveURL(/\/admin\/pre-pesquisa/);
  // A lista de respostas individuais não traz nada da pré-pesquisa.
  await g.goto(`/gestor/pesquisas/${pesquisa.id}/dashboard/respostas`);
  await expect(g.getByText(/Bebidas alcoólicas|Feminino/)).toHaveCount(0);

  // Relatório PDF continua gerando (com a página de perfil).
  const pdf = await g.request.get(`/gestor/pesquisas/${pesquisa.id}/dashboard/relatorio`);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // Admin: cruzamento por setor e com o índice do Eixo 1.
  const a = await (await browser.newContext()).newPage();
  await login(a, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await a.goto(`/admin/pre-pesquisa?pesquisa=${pesquisa.id}`);
  const sexo = a.getByRole("region", { name: "Sexo" });
  await expect(sexo.getByRole("columnheader", { name: "Setor Pre E2E" })).toBeVisible();
  const linhaFeminino = sexo.locator("tr", { hasText: "Feminino" });
  await expect(linhaFeminino.locator("td").nth(1)).toHaveText("3");
  await expect(linhaFeminino).toContainText(/\d,\d\d · (Baixo|Médio|Alto) risco/);
  // Grupo com menos de 3 não mostra índice.
  const alcool = a.getByRole("region", { name: "Bebidas alcoólicas" });
  await expect(alcool.locator("tr", { hasText: "Algumas vezes na semana" })).toContainText("< mín.");
});

test.afterAll(async () => {
  await db.$disconnect();
});
