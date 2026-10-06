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
  // Criar empresa calcula o hash da senha do gestor (bcrypt): com 8 testes em
  // paralelo passa dos 5 s padrão — o teste mede o resultado, não a velocidade.
  await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
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
 *  demais = 5 × 0,80 = 4,00 (controle) · setor = média 4,10 (alto risco).
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
          // Um plano de ação escrito no Eixo 2 (1ª questão do fator 5) — vira ação no Plano de ação.
          planoAcao: p.id === perguntas.find((x) => x.fatorRisco.dimensao.nome.startsWith("5."))!.id ? "Limitar horas extras habituais" : null,
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
      ["producao", "F51.2", "Ciclo vigília-sono", "10/03/2025", 20, "Sim", "Escalas noturnas"],
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

  // Topo: resultado geral em destaque (média dos setores com score = só Produção).
  const geral = page.getByRole("region", { name: "Resultado geral da empresa" });
  await expect(geral.getByText("4,10", { exact: true })).toBeVisible();
  await expect(geral.getByText("Risco existente", { exact: true })).toBeVisible();
  await expect(geral).toContainText("Alto risco · índice de 1 a 5");
  await expect(geral).toContainText("exige plano de ação e inclusão no PGR");
  const cartoesSetores = page.getByRole("region", { name: "Pontuação dos setores" });
  await expect(cartoesSetores).toContainText("Produção");
  await expect(cartoesSetores).toContainText(/Amostra insuficiente/);

  const resumo = page.getByRole("region", { name: "Painel resumido por setor" });
  const linhaResumo = resumo.locator("tr", { hasText: "Produção" });
  await expect(linhaResumo.getByText("60%")).toBeVisible(); // 6 de 10 colaboradores
  await expect(linhaResumo.getByText("4,10")).toBeVisible();
  await expect(resumo.locator("tr", { hasText: "Administrativo" }).getByText(/Amostra insuficiente/)).toBeVisible();

  // Empate em 100% dos setores: o fator mais grave (Horários, 4,95) vem primeiro.
  const achados = page.getByRole("region", { name: "Principais achados" });
  await expect(achados).toContainText("5. Horários e Jornada é o fator mais crítico");
  await expect(achados.locator("span.w-52").first()).toHaveText("Horários e Jornada");

  const matriz = page.getByRole("region", { name: "Matriz de decisão" });
  await expect(matriz.locator("tr", { hasText: "5. Horários e Jornada" }).getByText("4,95")).toBeVisible();
  await expect(matriz.locator("tr", { hasText: "10. Equilíbrio Trabalho-Vida" }).getByText("4,40")).toBeVisible();
  await expect(matriz.locator("tr", { hasText: "1. Instrução de Trabalho" }).getByText("4,00").first()).toBeVisible();

  // FMEA (à mão): Horários — S 4 +1 atestado +1 afastamento de 20 dias +1 expostos (100%) → 5 (teto);
  // O 5 (média 5,00); D 3 (Eixo 2 ×0,90) → matriz S5×O5 Alta, D 3 mantém → Alta, RPN 75.
  // Equilíbrio — S 3+3 → 5; O 5; D 1 (×0,80) desce um nível → Média, RPN 25.
  // Instrução de Trabalho (índice 4,00, acompanhamento) — S 2 +1 expostos = 3; O 5; D 1 → Média, RPN 15.
  const fmea = page.getByRole("region", { name: "Matriz FMEA" });
  const horarios = fmea.locator("tr", { hasText: "Produção · 5. Horários e Jornada" });
  await expect(horarios.getByText("Alta", { exact: true })).toBeVisible();
  await expect(horarios.getByText("75", { exact: true })).toBeVisible();
  await expect(horarios).toContainText("afastamento acima de 15 dias");
  await expect(horarios).toContainText("Plano até");
  const equilibrio = fmea.locator("tr", { hasText: "Produção · 10. Equilíbrio Trabalho-Vida" });
  await expect(equilibrio.getByText("Média", { exact: true })).toBeVisible();
  await expect(equilibrio.getByText("25", { exact: true })).toBeVisible();
  const instrucao = fmea.locator("tr", { hasText: "Produção · 1. Instrução de Trabalho" });
  await expect(instrucao.getByText("Média", { exact: true })).toBeVisible();
  await expect(instrucao.getByText("15", { exact: true })).toBeVisible();

  const pgr = page.getByRole("region", { name: "Riscos para o PGR" });
  await expect(pgr.locator("article")).toHaveCount(2);
  await expect(pgr.getByText("Produção · 5. Horários e Jornada")).toBeVisible();
  await expect(pgr.getByText(/Registrados no setor e relacionados ao trabalho: F51\.2/).first()).toBeVisible();

  const pdf = await page.request.get("/gestor/painel/relatorio");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  // ── Plano de ação (5W2H + PDCA) ────────────────────────────────────
  await page.getByRole("link", { name: "Plano de ação" }).click();
  const pendencias = page.getByRole("region", { name: "Fatores do PGR sem ação" });
  await expect(pendencias).toContainText("Produção · 5. Horários e Jornada");
  await page.getByRole("button", { name: "Gerar ações a partir do Eixo 2" }).click();
  await expect(page.getByText("1 ação(ões) criada(s)")).toBeVisible();
  await expect(pendencias).not.toContainText("5. Horários e Jornada"); // agora coberto pela ação
  await expect(pendencias).toContainText("10. Equilíbrio Trabalho-Vida");
  // Gerar de novo não duplica.
  await page.getByRole("button", { name: "Gerar ações a partir do Eixo 2" }).click();
  await expect(page.getByText(/Nada novo/)).toBeVisible();

  const linhaAcao = page.getByRole("table", { name: "Ações do plano" }).locator("tr", { hasText: "Limitar horas extras habituais" });
  await expect(linhaAcao.getByText("Alta", { exact: true })).toBeVisible(); // prioridade FMEA de Horários
  await linhaAcao.getByRole("link", { name: "Limitar horas extras habituais" }).click();

  // P → D exige quem/quando/onde.
  await page.getByRole("button", { name: "Iniciar execução (D)" }).click();
  await expect(page.getByText("Para iniciar a execução, preencha: responsável (quem).")).toBeVisible();
  await page.getByLabel(/^Quem/).fill("Ana Lima");
  await page.getByLabel("Quanto custa (R$)").fill("2.500,00");
  await page.getByRole("button", { name: "Salvar ação" }).click();
  await expect(page.getByText("Ação salva.")).toBeVisible();
  await expect(page.getByLabel("Quanto custa (R$)")).toHaveValue("2500,00");

  await page.getByRole("button", { name: "Iniciar execução (D)" }).click();
  await expect(page.getByRole("region", { name: "Andamento" })).toBeVisible();
  await page.getByRole("button", { name: "Enviar para verificação (C)" }).click();
  const verificacao = page.getByRole("region", { name: "Verificação de eficácia" });
  await expect(verificacao.locator("tr", { hasText: "Produção" })).toContainText("4,95");
  await verificacao.getByLabel("Eficaz", { exact: true }).check();
  await verificacao.getByRole("button", { name: "Registrar verificação" }).click();
  await expect(verificacao.getByText("Eficaz", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Histórico" })).toContainText("Responsável: — → Ana Lima");

  // O painel passa a mostrar a ação no lugar do prazo sugerido.
  await page.getByRole("link", { name: "Painel FRPRT" }).click();
  await expect(
    page.getByRole("region", { name: "Matriz FMEA" }).locator("tr", { hasText: "Produção · 5. Horários e Jornada" }),
  ).toContainText("Ação #1");

  const xlsx = await page.request.get("/gestor/plano/exportar?formato=xlsx");
  expect(xlsx.status()).toBe(200);
  expect((await xlsx.body()).subarray(0, 2).toString()).toBe("PK");
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

test("Plano de ação: gestor de outra empresa não abre a ação alheia", async ({ page }) => {
  const sufixo = Date.now();
  const emailA = `gestor-pa-a-${sufixo}@teste.local`;
  const emailB = `gestor-pa-b-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa PA A ${sufixo}`, emailA);
  await criarEmpresa(page, `Empresa PA B ${sufixo}`, emailB);

  await login(page, emailA, "senhaDoGestor123", /\/gestor$/);
  await page.goto("/gestor/plano/nova");
  await page.getByLabel(/^O quê/).fill("Ação da empresa A");
  await page.getByRole("button", { name: "Criar ação" }).click();
  await expect(page).toHaveURL(/\/gestor\/plano\/(?!nova$)[^/]+$/);
  const url = new URL(page.url()).pathname;

  await login(page, emailB, "senhaDoGestor123", /\/gestor$/);
  expect((await page.goto(url))?.status()).toBe(404);
});
