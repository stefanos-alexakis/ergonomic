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
};

/**
 * Fonte oficial: perguntas-pesquisa.xlsx, coluna E. Reextraído do xlsx
 * resolvendo os intervalos de mesclagem reais das colunas A/B/C — a
 * planilha tem fator de risco desalinhado da primeira linha de algumas
 * dimensões (ver review.md), então não dá para usar "carregar o último
 * valor visto" ingenuamente.
 */
function carregarPerguntas(): PerguntaSeed[] {
  const path = join(__dirname, "seed-data", "perguntas.json");
  const data = JSON.parse(readFileSync(path, "utf-8")) as PerguntaSeed[];
  if (data.length !== 42) {
    throw new Error(
      `Esperado 42 perguntas (25 Bloco 1 + 17 Bloco 2), encontrado ${data.length}. ` +
        `Não seedando — confira perguntas-pesquisa.xlsx e prisma/seed-data/perguntas.json.`,
    );
  }
  const bloco1 = data.filter((p) => p.bloco.toUpperCase().startsWith("BLOCO 1")).length;
  const bloco2 = data.filter((p) => p.bloco.toUpperCase().startsWith("BLOCO 2")).length;
  if (bloco1 !== 25 || bloco2 !== 17) {
    throw new Error(
      `Esperado 25 perguntas no Bloco 1 e 17 no Bloco 2, encontrado ${bloco1} + ${bloco2}.`,
    );
  }
  return data;
}

async function seedQuestionario() {
  const perguntas = carregarPerguntas();

  const questionario = await prisma.questionario.upsert({
    where: { id: "questionario-riscos-psicossociais-v1" },
    update: {},
    create: {
      id: "questionario-riscos-psicossociais-v1",
      nome: "Mapeamento dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT)",
      versao: 1,
    },
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
            update: {
              texto: p.texto,
              situacaoInvestigada: p.situacaoInvestigada,
              ordemGlobal: p.ordemGlobal,
            },
            create: {
              id: `${fator.id}-p-${p.ordemGlobal}`,
              fatorRiscoId: fator.id,
              texto: p.texto,
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

  console.log(
    `Seed do questionário concluído: ${totalCriadas} perguntas processadas, ${totalNoBanco} no banco para "${questionario.nome}" (esperado: 42).`,
  );
  if (totalNoBanco !== 42) {
    throw new Error(`Inconsistência pós-seed: banco tem ${totalNoBanco} perguntas, esperado 42.`);
  }
}

async function main() {
  await seedQuestionario();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
