import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

/**
 * Simula N respondentes concluídos direto no banco, sem passar pela UI
 * (a jornada do colaborador já é testada de ponta a ponta em
 * jornada-colaborador.spec.ts) — aqui o que se testa é o painel do
 * gestor: contagem, média e a regra de supressão de grupo pequeno.
 */
async function seedRespondentesConcluidos(
  pesquisaId: string,
  questionarioId: string,
  distribuicaoPorSetor: Record<string, number>,
  departamentoId: string,
  workspaceId: string,
) {
  const perguntas = await db.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId } } } },
    select: { id: true },
  });

  for (const [nomeSetor, quantidade] of Object.entries(distribuicaoPorSetor)) {
    const setor = await db.setorOrg.upsert({
      where: { workspaceId_nome: { workspaceId, nome: nomeSetor } },
      update: {},
      create: { workspaceId, nome: nomeSetor },
    });

    for (let i = 0; i < quantidade; i++) {
      const codigo = await db.codigoAcesso.create({
        data: {
          pesquisaId,
          codigo: `SEED${nomeSetor}${i}${Date.now()}`.slice(0, 40),
          tipo: "PARTICIPANTE",
          status: "CONCLUIDO",
        },
      });
      const resposta = await db.resposta.create({
        data: {
          codigoAcessoId: codigo.id,
          setorId: setor.id,
          departamentoId,
          concluidoEm: new Date(),
        },
      });
      await db.respostaItem.createMany({
        data: perguntas.map((p) => ({ respostaId: resposta.id, perguntaId: p.id, valor: 3 })),
      });
    }
  }
}

test("painel do gestor: estado insuficiente, depois contagem e supressão corretas", async ({ page }) => {
  const sufixo = Date.now();
  const nomeEmpresa = `Empresa Dashboard E2E ${sufixo}`;
  const gestorEmail = `gestor-dash-${sufixo}@teste.local`;
  const gestorSenha = "senhaDoGestor123";

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Senha").fill(ADMIN_SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto("/admin/empresas/nova");
  await page.getByLabel("Nome da empresa").fill(nomeEmpresa);
  await page.getByLabel("Nome", { exact: true }).fill("Gestor Dashboard E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(gestorEmail);
  await page.getByLabel("Senha provisória").fill(gestorSenha);
  await page.getByRole("button", { name: "Criar empresa" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(gestorEmail);
  await page.getByLabel("Senha").fill(gestorSenha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/gestor$/);

  await page.getByRole("link", { name: "Setores e funções" }).click();
  const inputDepto = page.locator('form:has(input[value="departamento"]) input[name="nome"]');
  await inputDepto.fill("Depto Dashboard E2E");
  await inputDepto.press("Enter");
  await expect(page.getByText("Depto Dashboard E2E")).toBeVisible();

  await page.goto("/gestor");
  const agora = new Date();
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const proximoMes = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 16);

  await page.getByRole("link", { name: "+ Nova pesquisa" }).click();
  await page.getByLabel("Nome da pesquisa").fill("Pesquisa Dashboard E2E");
  await page.getByLabel("Quantidade de licenças").fill("20");
  await page.getByLabel("Início").fill(fmt(ontem));
  await page.getByLabel("Encerramento").fill(fmt(proximoMes));
  await page.getByRole("button", { name: "Criar pesquisa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);

  await page.getByRole("link", { name: "Pesquisa Dashboard E2E" }).click();
  await page.getByRole("button", { name: "Gerar licenças e códigos de acesso" }).click();
  await expect(page.getByText(/códigos de participante/)).toBeVisible();

  const linkCartoes = await page
    .getByRole("link", { name: "Baixar cartões em PDF (com QR code)" })
    .getAttribute("href");
  const pesquisaId = linkCartoes?.match(/\/gestor\/pesquisas\/([^/]+)\/cartoes/)?.[1];
  if (!pesquisaId) throw new Error("Não achou o id da pesquisa no link de cartões.");

  // Estado inicial: nenhuma resposta concluída ainda -> "insuficiente".
  await page.goto(`/gestor/pesquisas/${pesquisaId}/dashboard`);
  await expect(page.getByText(/ainda não há respostas concluídas suficientes/i)).toBeVisible();

  // Semeia 3 grupos: um bem visível (10), um que teria N>=limite mas é
  // suprimido pela regra anti-subtração (6), e um pequeno de verdade (1).
  const workspace = await db.workspace.findFirstOrThrow({ where: { nome: nomeEmpresa } });
  const pesquisa = await db.pesquisa.findUniqueOrThrow({ where: { id: pesquisaId } });
  const departamento = await db.departamento.findFirstOrThrow({
    where: { workspaceId: workspace.id, nome: "Depto Dashboard E2E" },
  });

  await seedRespondentesConcluidos(
    pesquisaId,
    pesquisa.questionarioId,
    { "Setor Grande E2E": 10, "Setor Medio E2E": 6, "Setor Pequeno E2E": 1 },
    departamento.id,
    workspace.id,
  );

  await page.reload();
  await expect(page.getByText(/ainda não há respostas concluídas suficientes/i)).not.toBeVisible();
  await expect(page.getByTestId("contador-concluidas")).toHaveText("17");
  await expect(page.getByTestId("contador-iniciadas")).toHaveText("17");
  await expect(page.getByTestId("contador-distribuidos")).toHaveText("37"); // 20 do botão + 17 semeados
  await expect(page.getByText(/Média geral de risco: 3\.00/)).toBeVisible();

  await expect(page.getByText("Setor Grande E2E")).toBeVisible();
  const linhaGrande = page.locator("tr", { hasText: "Setor Grande E2E" });
  await expect(linhaGrande.getByText("10", { exact: true })).toBeVisible();

  const linhaMedio = page.locator("tr", { hasText: "Setor Medio E2E" });
  await expect(linhaMedio.getByText(/dados insuficientes/i)).toBeVisible();
  const linhaPequeno = page.locator("tr", { hasText: "Setor Pequeno E2E" });
  await expect(linhaPequeno.getByText(/dados insuficientes/i)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Baixar relatório em PDF" }).click(),
  ]);
  const caminho = await download.path();
  const fs = await import("node:fs");
  const conteudo = fs.readFileSync(caminho!);
  expect(conteudo.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  expect(conteudo.length).toBeGreaterThan(1000);

  await db.$disconnect();
});
