import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@teste.local";
const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? "senhaForte123";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const DIA = 86_400_000;

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

test("relatório final no modelo da cliente: textos editáveis, prévia, emissão, PDFs do Eixo 2 e 3 e fator 11 fora da FMEA", async ({ page }) => {
  test.setTimeout(300_000);
  const sufixo = Date.now();
  const empresa = `Empresa Relatorio Final ${sufixo}`;
  const email = `gestor-final-${sufixo}@teste.local`;
  const outraEmail = `gestor-final-b-${sufixo}@teste.local`;
  await criarEmpresa(page, `Empresa Outra Final ${sufixo}`, outraEmail);
  await criarEmpresa(page, empresa, email);

  // ── Dados: 5 respostas (tudo 4), Eixo 2 concluído, Eixo 3 com F, Z e um outro CID, 1 responsável ──
  const ws = await db.workspace.findFirstOrThrow({ where: { nome: empresa } });
  const questionario = await db.questionario.findFirstOrThrow({ where: { ativo: true } });
  const perguntas = await db.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: questionario.id } } } },
    select: { id: true, questaoEixo2: { select: { id: true } } },
  });
  const setor = await db.setorOrg.create({ data: { workspaceId: ws.id, nome: "Operação", numeroColaboradores: 8 } });
  const pesquisa = await db.pesquisa.create({
    data: {
      workspaceId: ws.id,
      questionarioId: questionario.id,
      nome: "Pesquisa Final",
      slug: `pesquisa-final-${sufixo}`,
      dataInicio: new Date(Date.now() - 10 * DIA),
      dataFim: new Date(Date.now() - DIA),
      licencasSolicitadas: 5,
    },
  });
  for (let i = 0; i < 5; i++) {
    const codigo = await db.codigoAcesso.create({
      data: { pesquisaId: pesquisa.id, codigo: `FIN${sufixo}${i}`, tipo: "PARTICIPANTE", status: "CONCLUIDO" },
    });
    await db.resposta.create({
      data: {
        codigoAcessoId: codigo.id,
        setorId: setor.id,
        concluidoEm: new Date(),
        itens: { create: perguntas.map((p) => ({ perguntaId: p.id, valor: 4 })) },
      },
    });
  }
  await db.avaliacaoEixo2.create({
    data: {
      workspaceId: ws.id,
      questionarioId: questionario.id,
      nome: "Avaliação Final",
      status: "CONCLUIDA",
      concluidaEm: new Date(),
      sinaisRevisadosEm: new Date(),
      setores: { create: [{ setorId: setor.id }] },
      respostas: {
        create: perguntas.map((p, i) => ({
          questaoId: p.questaoEixo2!.id,
          setorId: setor.id,
          condicao: i % 3 === 0 ? "INEXISTENTE" : "EFICAZ",
          planoAcao: i === 0 ? "Atualizar as descrições de cargo" : null,
        })),
      },
    },
  });
  await db.levantamentoEixo3.create({
    data: {
      workspaceId: ws.id,
      nome: "Atestados Final",
      periodoInicio: new Date(Date.now() - 365 * DIA),
      periodoFim: new Date(Date.now() - DIA),
      status: "PUBLICADO",
      publicadoEm: new Date(),
      declaracaoAceitaEm: new Date(),
      declaracaoAceitaPor: "RH",
      ocorrencias: {
        create: [
          { setorId: setor.id, setorOriginal: "Operação", linhaPlanilha: 2, cid: "F41", relacao: "SIM", diasAfastados: 5, dataInicio: new Date(Date.UTC(2026, 2, 1)), matricula: "7777" },
          { setorId: setor.id, setorOriginal: "Operação", linhaPlanilha: 3, cid: "Z73.0", relacao: "INCONCLUSIVO", diasAfastados: 3, dataInicio: new Date(Date.UTC(2026, 3, 1)) },
          { setorId: setor.id, setorOriginal: "Operação", linhaPlanilha: 4, cid: "OUTRO", relacao: "NAO", diasAfastados: 1, dataInicio: new Date(Date.UTC(2025, 11, 1)) },
        ],
      },
    },
  });
  await db.responsavelRelatorio.create({
    data: { workspaceId: ws.id, areaFuncao: "SESMT", nome: "Paula Prado", email: "paula@exemplo.com", celular: "11 90000-0000", incluirNoRelatorio: true, ordem: 1 },
  });

  // ── Consultoria (admin como gestor) ──
  await login(page, ADMIN_EMAIL, ADMIN_SENHA, /\/admin$/);
  await page.locator("tr", { hasText: empresa }).getByRole("button", { name: "Acessar como gestor desta empresa" }).click();
  await expect(page).toHaveURL(/\/gestor$/);

  // Painel: o fator 11 sai da FMEA e aparece no termômetro de assédio e violência.
  await page.goto("/gestor/painel");
  await expect(page.getByRole("region", { name: "Assédio e violência" })).toContainText("Operação");
  const fmea = page.getByRole("region", { name: "Matriz FMEA" });
  await expect(fmea.getByText("Operação · 6. Segurança no Emprego")).toBeVisible(); // os demais fatores seguem na FMEA
  await expect(fmea.getByText(/Operação · 11\./)).toHaveCount(0); // o fator 11 não

  await page.getByRole("link", { name: "Relatório final" }).click();
  await expect(page.getByRole("heading", { name: "Relatório final (modelo da consultoria)" })).toBeVisible();

  // Textos gerados pelo sistema aparecem preenchidos.
  const resumo = page.getByLabel("Eixo 2 · Resumo executivo");
  await expect(resumo).toHaveValue(/Foram registradas \d+ respostas \(1 setor\(es\) avaliado\(s\)\)/);
  await expect(page.getByLabel("Referências · documentos internos e fontes primárias")).toHaveValue(/Pesquisa Final/);

  await page.getByLabel("Cruzamento analítico dos Eixos 1, 2 e 3").fill("Na Operação, a percepção de sobrecarga foi confirmada pelos registros de banco de horas.");
  await resumo.fill("- Resumo escrito pelo consultor.");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo.")).toBeVisible({ timeout: 30_000 });
  const r = await db.relatorioRascunho.findUniqueOrThrow({ where: { workspaceId: ws.id } });
  expect(r.cruzamentoAnalitico).toContain("banco de horas");
  expect(r.resumoEixo2).toBe("- Resumo escrito pelo consultor.");

  // Voltar ao texto do sistema: guarda nulo (passa a acompanhar os dados).
  await page.getByRole("button", { name: "Voltar ao texto gerado pelo sistema" }).first().click();
  await expect(resumo).toHaveValue(/Foram registradas/);
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  // A mensagem do 1º salvamento continua na tela: espera o banco refletir o 2º.
  await expect
    .poll(async () => (await db.relatorioRascunho.findUniqueOrThrow({ where: { workspaceId: ws.id } })).resumoEixo2, { timeout: 30_000 })
    .toBeNull();

  // Prévia e emissão.
  const previa = await page.request.get("/gestor/painel/relatorio-final/previa");
  expect(previa.status()).toBe(200);
  expect((await previa.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect(await db.relatorioEmitido.count({ where: { workspaceId: ws.id } })).toBe(0);

  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /Emitir versão 1/ }).click();
  await expect(page.getByText("Versão 1 emitida.")).toBeVisible({ timeout: 90_000 });
  const emitido = await db.relatorioEmitido.findFirstOrThrow({ where: { workspaceId: ws.id } });
  expect(emitido.modelo).toBe("FINAL");
  expect(JSON.stringify(emitido.responsaveis)).toContain("Paula Prado");
  await expect(page.getByRole("region", { name: "Versões emitidas" }).locator("tbody tr")).toHaveCount(1);
  // O relatório completo não lista a versão do relatório final.
  await page.goto("/gestor/painel/relatorio-completo");
  await expect(page.getByText("Nenhuma versão emitida ainda.")).toBeVisible();
  expect((await page.request.get("/gestor/painel/relatorio-completo/versao/1")).status()).toBe(404);

  // PDFs avulsos do Eixo 2 e do Eixo 3.
  const avaliacao = await db.avaliacaoEixo2.findFirstOrThrow({ where: { workspaceId: ws.id } });
  const levantamento = await db.levantamentoEixo3.findFirstOrThrow({ where: { workspaceId: ws.id } });
  for (const url of [`/gestor/eixo2/${avaliacao.id}/resultado/relatorio-pdf`, `/gestor/eixo3/${levantamento.id}/relatorio-pdf`]) {
    const res = await page.request.get(url);
    expect(res.status()).toBe(200);
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  }
  await page.goto(`/gestor/eixo2/${avaliacao.id}/resultado`);
  await expect(page.getByRole("link", { name: "Relatório do Eixo 2 (PDF)" })).toBeVisible();
  await page.goto(`/gestor/eixo3/${levantamento.id}`);
  await expect(page.getByRole("link", { name: "Relatório do Eixo 3 (PDF)" })).toBeVisible();

  // ── Gestor: só baixa; não pré-visualiza ──
  await login(page, email, "senhaDoGestor123", /\/gestor$/);
  await page.goto("/gestor/painel/relatorio-final");
  await expect(page.getByText(/redigido e emitido pela consultoria/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Emitir versão/ })).toHaveCount(0);
  const download = await page.request.get("/gestor/painel/relatorio-final/versao/1");
  expect(download.status()).toBe(200);
  expect((await download.body()).subarray(0, 5).toString()).toBe("%PDF-");
  expect((await page.request.get("/gestor/painel/relatorio-final/previa")).status()).toBe(403);

  // ── Outra empresa: não baixa a versão nem os PDFs dos eixos ──
  await login(page, outraEmail, "senhaDoGestor123", /\/gestor$/);
  expect((await page.request.get("/gestor/painel/relatorio-final/versao/1")).status()).toBe(404);
  expect((await page.request.get(`/gestor/eixo2/${avaliacao.id}/resultado/relatorio-pdf`)).status()).toBe(404);
  expect((await page.request.get(`/gestor/eixo3/${levantamento.id}/relatorio-pdf`)).status()).toBe(404);
});
