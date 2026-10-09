import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const __dirname = dirname(fileURLToPath(import.meta.url));

type PerguntaSeed = {
  ordemGlobal: number;
  bloco: string;
  dimensao: string;
  fatorRisco: string;
  situacaoInvestigada: string;
  texto: string;
  exemplo?: string | null;
};

type VersaoQuestionario = {
  id: string;
  versao: number;
  arquivo: string;
  bloco1: number;
  bloco2: number;
};

/**
 * Cada versão do questionário é um conjunto próprio de linhas no banco —
 * nunca se edita uma versão anterior no lugar: as respostas antigas
 * apontam para as perguntas que de fato foram respondidas, e reescrever o
 * texto delas mudaria o sentido do que a pessoa marcou. Pesquisas já
 * criadas continuam na versão delas; só pesquisas novas pegam a ativa.
 *
 * v1: perguntas-pesquisa.xlsx (42 perguntas), reextraído resolvendo as
 *     mesclagens reais das colunas A/B/C (ver review.md).
 * v2: revisão da cliente em EIXO_01_PERCEPCAO_COLABORADOR_REVISADO.docx
 *     (35 perguntas, set/2026), extraída respeitando as células mescladas
 *     do Word. Dimensões/fatores: as 13 da metodologia, com os nomes da
 *     planilha Fatores × CID-F — as mesmas do Eixo 2, que é calculado por
 *     fator (realinhado em out/2026; antes estava em 10 dimensões).
 */
const V1: VersaoQuestionario = {
  id: "questionario-riscos-psicossociais-v1",
  versao: 1,
  arquivo: "perguntas.json",
  bloco1: 25,
  bloco2: 17,
};

const V2: VersaoQuestionario = {
  id: "questionario-riscos-psicossociais-v2",
  versao: 2,
  arquivo: "perguntas-v2.json",
  bloco1: 21,
  bloco2: 14,
};

const NOME_QUESTIONARIO = "Mapeamento dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT)";

function carregarPerguntas(v: VersaoQuestionario): PerguntaSeed[] {
  const path = join(__dirname, "seed-data", v.arquivo);
  const data = JSON.parse(readFileSync(path, "utf-8")) as PerguntaSeed[];
  const total = v.bloco1 + v.bloco2;
  if (data.length !== total) {
    throw new Error(
      `Versão ${v.versao}: esperado ${total} perguntas (${v.bloco1} Bloco 1 + ${v.bloco2} Bloco 2), ` +
        `encontrado ${data.length}. Não seedando — confira prisma/seed-data/${v.arquivo}.`,
    );
  }
  const bloco1 = data.filter((p) => p.bloco.toUpperCase().startsWith("BLOCO 1")).length;
  const bloco2 = data.filter((p) => p.bloco.toUpperCase().startsWith("BLOCO 2")).length;
  if (bloco1 !== v.bloco1 || bloco2 !== v.bloco2) {
    throw new Error(
      `Versão ${v.versao}: esperado ${v.bloco1} perguntas no Bloco 1 e ${v.bloco2} no Bloco 2, ` +
        `encontrado ${bloco1} + ${bloco2}.`,
    );
  }
  return data;
}

async function seedQuestionario(v: VersaoQuestionario) {
  const perguntas = carregarPerguntas(v);

  // update vazio: reexecutar o seed nunca mexe em `ativo` aqui — quem
  // decide a versão ativa é ativarVersao(), no fim.
  const questionario = await prisma.questionario.upsert({
    where: { id: v.id },
    update: {},
    create: { id: v.id, nome: NOME_QUESTIONARIO, versao: v.versao, ativo: false },
  });

  // Agrupa mantendo a ordem de primeira ocorrência (bloco -> dimensão -> fator)
  const blocosOrdem: string[] = [];
  const dimensoesPorBloco = new Map<string, string[]>();
  const fatoresPorDimensao = new Map<string, string[]>();
  const perguntasPorFator = new Map<string, PerguntaSeed[]>();

  for (const p of perguntas) {
    if (!blocosOrdem.includes(p.bloco)) blocosOrdem.push(p.bloco);

    const dims = dimensoesPorBloco.get(p.bloco) ?? [];
    if (!dims.includes(p.dimensao)) dims.push(p.dimensao);
    dimensoesPorBloco.set(p.bloco, dims);

    const fatores = fatoresPorDimensao.get(p.dimensao) ?? [];
    if (!fatores.includes(p.fatorRisco)) fatores.push(p.fatorRisco);
    fatoresPorDimensao.set(p.dimensao, fatores);

    const lista = perguntasPorFator.get(`${p.dimensao}::${p.fatorRisco}`) ?? [];
    lista.push(p);
    perguntasPorFator.set(`${p.dimensao}::${p.fatorRisco}`, lista);
  }

  let totalCriadas = 0;

  for (const [bi, nomeBloco] of blocosOrdem.entries()) {
    const bloco = await prisma.bloco.upsert({
      where: { id: `${questionario.id}-bloco-${bi + 1}` },
      update: { nome: nomeBloco, ordem: bi + 1 },
      create: {
        id: `${questionario.id}-bloco-${bi + 1}`,
        questionarioId: questionario.id,
        nome: nomeBloco,
        ordem: bi + 1,
      },
    });

    const dimensoes = dimensoesPorBloco.get(nomeBloco) ?? [];
    for (const [di, nomeDimensao] of dimensoes.entries()) {
      const dimensao = await prisma.dimensao.upsert({
        where: { id: `${bloco.id}-dim-${di + 1}` },
        update: { nome: nomeDimensao, ordem: di + 1 },
        create: {
          id: `${bloco.id}-dim-${di + 1}`,
          blocoId: bloco.id,
          nome: nomeDimensao,
          ordem: di + 1,
        },
      });

      const fatores = fatoresPorDimensao.get(nomeDimensao) ?? [];
      for (const [fi, nomeFator] of fatores.entries()) {
        const fator = await prisma.fatorRisco.upsert({
          where: { id: `${dimensao.id}-fator-${fi + 1}` },
          update: { nome: nomeFator },
          create: {
            id: `${dimensao.id}-fator-${fi + 1}`,
            dimensaoId: dimensao.id,
            nome: nomeFator,
          },
        });

        const perguntasDoFator = perguntasPorFator.get(`${nomeDimensao}::${nomeFator}`) ?? [];
        for (const p of perguntasDoFator) {
          await prisma.pergunta.upsert({
            where: { id: `${fator.id}-p-${p.ordemGlobal}` },
            // `peso` fica de fora do update de propósito: é configurado
            // pela Hozana em /admin/perguntas e não pode voltar a 1 a cada seed.
            update: {
              texto: p.texto,
              exemplo: p.exemplo ?? null,
              situacaoInvestigada: p.situacaoInvestigada,
              ordemGlobal: p.ordemGlobal,
            },
            create: {
              id: `${fator.id}-p-${p.ordemGlobal}`,
              fatorRiscoId: fator.id,
              texto: p.texto,
              exemplo: p.exemplo ?? null,
              situacaoInvestigada: p.situacaoInvestigada,
              ordemGlobal: p.ordemGlobal,
            },
          });
          totalCriadas++;
        }
      }
    }
  }

  const totalNoBanco = await prisma.pergunta.count({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: questionario.id } } } },
  });

  const esperado = v.bloco1 + v.bloco2;
  console.log(
    `Seed do questionário v${v.versao} concluído: ${totalCriadas} perguntas processadas, ` +
      `${totalNoBanco} no banco (esperado: ${esperado}).`,
  );
  if (totalNoBanco !== esperado) {
    throw new Error(
      `Inconsistência pós-seed v${v.versao}: banco tem ${totalNoBanco} perguntas, esperado ${esperado}.`,
    );
  }
}

/** Deixa exatamente uma versão ativa — a que pesquisas novas vão usar. */
async function ativarVersao(v: VersaoQuestionario) {
  await prisma.$transaction([
    prisma.questionario.updateMany({ where: { id: { not: v.id } }, data: { ativo: false } }),
    prisma.questionario.update({ where: { id: v.id }, data: { ativo: true } }),
  ]);
  console.log(`Questionário ativo para pesquisas novas: v${v.versao}.`);
}

type QuestaoEixo2Seed = {
  ordem: number;
  perguntaColaborador: string;
  texto: string;
  planoSugerido: string | null;
};

/**
 * Catálogo do Eixo 2 (EIXO_02_FINAL_PERGUNTAS_E_INTERVENCOES_ORIGINAIS.docx):
 * uma pergunta à empresa para cada pergunta do Eixo 1 v2, ligada pela
 * numeração. A ligação é o que dá à questão do Eixo 2 sua dimensão e fator.
 */
async function seedEixo2(v: VersaoQuestionario) {
  const path = join(__dirname, "seed-data", "eixo2-v2.json");
  const itens = JSON.parse(readFileSync(path, "utf-8")) as QuestaoEixo2Seed[];
  const esperado = v.bloco1 + v.bloco2;
  if (itens.length !== esperado) {
    throw new Error(`Eixo 2: esperado ${esperado} questões, encontrado ${itens.length} em eixo2-v2.json.`);
  }

  const perguntas = await prisma.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: v.id } } } },
    select: { id: true, ordemGlobal: true },
  });
  const porOrdem = new Map(perguntas.map((p) => [p.ordemGlobal, p.id]));

  for (const item of itens) {
    const perguntaEixo1Id = porOrdem.get(item.ordem);
    if (!perguntaEixo1Id) {
      throw new Error(`Eixo 2: questão ${item.ordem} sem pergunta correspondente no Eixo 1 v${v.versao}.`);
    }
    await prisma.questaoEixo2.upsert({
      where: { perguntaEixo1Id },
      // `peso` fora do update: configurado pelo admin, não volta a 1 a cada seed.
      update: { texto: item.texto, planoSugerido: item.planoSugerido, ordem: item.ordem },
      create: { perguntaEixo1Id, texto: item.texto, planoSugerido: item.planoSugerido, ordem: item.ordem },
    });
  }

  const total = await prisma.questaoEixo2.count({
    where: { perguntaEixo1: { fatorRisco: { dimensao: { bloco: { questionarioId: v.id } } } } },
  });
  console.log(`Seed do Eixo 2 (catálogo da v${v.versao}) concluído: ${total} questões (esperado: ${esperado}).`);
  if (total !== esperado) throw new Error(`Inconsistência pós-seed do Eixo 2: ${total} questões.`);
}

type MatrizCidSeed = {
  ordem: number;
  situacao: string;
  consequencias: string;
  cids: string[];
  naoEspecifico: boolean;
  cidsDescricao: string;
  observacaoTecnica: string;
};

/**
 * Matriz Fatores × CID F (PLanilha-Eixo3-completa.xlsx, aba 2): uma linha
 * por situação investigada, ligada à pergunta do Eixo 1 de mesma numeração.
 * Decide quais fatores uma ocorrência CID-F relacionada ao trabalho agrava.
 */
async function seedMatrizCid(v: VersaoQuestionario) {
  const path = join(__dirname, "seed-data", "matriz-cid-v2.json");
  const itens = JSON.parse(readFileSync(path, "utf-8")) as MatrizCidSeed[];
  const esperado = v.bloco1 + v.bloco2;
  if (itens.length !== esperado) {
    throw new Error(`Matriz CID: esperado ${esperado} situações, encontrado ${itens.length}.`);
  }

  const perguntas = await prisma.pergunta.findMany({
    where: { fatorRisco: { dimensao: { bloco: { questionarioId: v.id } } } },
    select: { id: true, ordemGlobal: true },
  });
  const porOrdem = new Map(perguntas.map((p) => [p.ordemGlobal, p.id]));

  for (const item of itens) {
    const perguntaEixo1Id = porOrdem.get(item.ordem);
    if (!perguntaEixo1Id) throw new Error(`Matriz CID: situação ${item.ordem} sem pergunta no Eixo 1 v${v.versao}.`);
    const dados = {
      cids: item.cids,
      naoEspecifico: item.naoEspecifico,
      cidsDescricao: item.cidsDescricao,
      consequencias: item.consequencias,
      observacaoTecnica: item.observacaoTecnica,
    };
    await prisma.matrizCidSituacao.upsert({
      where: { perguntaEixo1Id },
      update: dados,
      create: { perguntaEixo1Id, ...dados },
    });
  }
  console.log(`Seed da matriz Fatores × CID F (v${v.versao}) concluído: ${itens.length} situações.`);
}

type SeveridadeSeed = { fator: number; severidade: number; justificativa: string };

/**
 * Severidade-base FMEA de cada fator (docs/proposta-fmea.html). Só CRIA o
 * que falta: depois de publicada, a tabela é ajustada pelo admin na tela
 * "Severidade dos fatores" e um novo seed não pode desfazer esse ajuste.
 */
async function seedSeveridadeFmea(v: VersaoQuestionario) {
  const path = join(__dirname, "seed-data", "severidade-fmea-v2.json");
  const itens = JSON.parse(readFileSync(path, "utf-8")) as SeveridadeSeed[];
  const dimensoes = await prisma.dimensao.findMany({
    where: { bloco: { questionarioId: v.id } },
    select: { id: true, nome: true },
  });
  const porNumero = new Map(dimensoes.map((d) => [Number.parseInt(d.nome, 10), d.id]));
  if (itens.length !== porNumero.size) {
    throw new Error(`Severidade FMEA: ${itens.length} fatores no arquivo, ${porNumero.size} dimensões na v${v.versao}.`);
  }
  let criados = 0;
  for (const item of itens) {
    const dimensaoId = porNumero.get(item.fator);
    if (!dimensaoId) throw new Error(`Severidade FMEA: fator ${item.fator} sem dimensão na v${v.versao}.`);
    if (item.severidade < 1 || item.severidade > 5) throw new Error(`Severidade FMEA: fator ${item.fator} fora de 1–5.`);
    const existente = await prisma.severidadeFator.findUnique({ where: { dimensaoId } });
    if (existente) continue;
    await prisma.severidadeFator.create({
      data: { dimensaoId, severidade: item.severidade, justificativa: item.justificativa },
    });
    criados++;
  }
  console.log(`Seed da severidade FMEA (v${v.versao}): ${criados} criada(s), ${itens.length - criados} mantida(s).`);
}

/**
 * Marca as situações que vão para o PGR (seed-data/pgr-situacoes-v2.json),
 * casando pela descrição da situação — a numeração da consultoria difere
 * da nossa. Só na primeira vez (nenhuma marcada ainda na versão): depois,
 * o admin ajusta na tela "Pesos das perguntas" e um novo seed não desfaz.
 */
async function seedSituacoesPgr(v: VersaoQuestionario) {
  const path = join(__dirname, "seed-data", "pgr-situacoes-v2.json");
  const { situacoes } = JSON.parse(readFileSync(path, "utf-8")) as { situacoes: string[] };
  const daVersao = { fatorRisco: { dimensao: { bloco: { questionarioId: v.id } } } };
  if (await prisma.pergunta.count({ where: { ...daVersao, vaiParaPgr: true } })) {
    console.log(`Situações do PGR (v${v.versao}): já configuradas, mantidas.`);
    return;
  }
  const perguntas = await prisma.pergunta.findMany({ where: daVersao, select: { id: true, situacaoInvestigada: true } });
  const ids = situacoes.map((t) => {
    const p = perguntas.find((x) => x.situacaoInvestigada.trim() === t.trim());
    if (!p) throw new Error(`Situação do PGR não encontrada na v${v.versao}: "${t}"`);
    return p.id;
  });
  await prisma.pergunta.updateMany({ where: { id: { in: ids } }, data: { vaiParaPgr: true } });
  console.log(`Situações do PGR (v${v.versao}): ${ids.length} marcada(s).`);
}

async function main() {
  await seedQuestionario(V1);
  await seedQuestionario(V2);
  await seedEixo2(V2);
  await seedMatrizCid(V2);
  await seedSeveridadeFmea(V2);
  await seedSituacoesPgr(V2);
  await ativarVersao(V2);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
