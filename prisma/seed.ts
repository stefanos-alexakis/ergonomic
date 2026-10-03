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
 *     do Word; dimensões seguem o documento ao pé da letra (decisão do
 *     usuário) e o grupo que ficou sem nome virou "6. Segurança e Mudanças".
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

async function main() {
  await seedQuestionario(V1);
  await seedQuestionario(V2);
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
