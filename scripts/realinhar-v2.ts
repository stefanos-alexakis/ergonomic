import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Uso único (out/2026): o questionário v2 foi publicado agrupado em 10
 * dimensões, mas o Eixo 2, a planilha CID-F e a metodologia trabalham com
 * as 13 dimensões originais e calculam POR FATOR. Os IDs das perguntas
 * derivam do fator, então não dá para só renomear: apaga-se a árvore da v2
 * e o seed (`npx prisma db seed`) a recria com 13 dimensões.
 *
 * Só pode rodar enquanto a v2 não tem uso real. Travas:
 *  - a única pesquisa permitida na v2 é a de teste informada em
 *    APAGAR_PESQUISA_ID (decisão do usuário: apagar o teste);
 *  - aborta se essa pesquisa tiver mais respostas que MAX_RESPOSTAS;
 *  - aborta se já existir avaliação do Eixo 2 usando a v2.
 *
 * Uso: APAGAR_PESQUISA_ID=<id> MAX_RESPOSTAS=1 npx tsx scripts/realinhar-v2.ts
 * Rode `pg_dump` antes. Depois: `npx prisma db seed`.
 */

const V2 = "questionario-riscos-psicossociais-v2";

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const permitida = process.env.APAGAR_PESQUISA_ID ?? null;
    const maxRespostas = Number(process.env.MAX_RESPOSTAS ?? "0");

    const questionario = await db.questionario.findUnique({ where: { id: V2 } });
    if (!questionario) {
      console.log("v2 não existe neste banco — nada a realinhar. Rode o seed.");
      return;
    }

    const pesquisas = await db.pesquisa.findMany({
      where: { questionarioId: V2 },
      select: { id: true, nome: true, _count: { select: { codigos: true } } },
    });
    const outras = pesquisas.filter((p) => p.id !== permitida);
    if (outras.length > 0) {
      throw new Error(
        `ABORTADO: há pesquisas na v2 além da permitida: ${outras.map((p) => `${p.nome} (${p.id})`).join(", ")}`,
      );
    }

    const respostas = await db.resposta.count({ where: { codigoAcesso: { pesquisa: { questionarioId: V2 } } } });
    if (respostas > maxRespostas) {
      throw new Error(`ABORTADO: ${respostas} respostas na v2, limite informado ${maxRespostas}.`);
    }

    const avaliacoes = await db.avaliacaoEixo2.count({ where: { questionarioId: V2 } });
    if (avaliacoes > 0) throw new Error(`ABORTADO: ${avaliacoes} avaliação(ões) do Eixo 2 já usam a v2.`);

    const v1 = await db.questionario.findFirst({ where: { versao: 1 } });

    await db.$transaction(async (tx) => {
      if (permitida && pesquisas.length > 0) {
        await tx.pesquisa.delete({ where: { id: permitida } }); // códigos/respostas/itens em cascata
      }
      await tx.questionario.delete({ where: { id: V2 } }); // blocos/dimensões/fatores/perguntas em cascata
      // Sem a v2, pesquisas novas não teriam questionário ativo até o seed
      // rodar — reativa a v1 nesse intervalo; o seed volta a ativar a v2.
      if (v1) await tx.questionario.update({ where: { id: v1.id }, data: { ativo: true } });
    });

    console.log(
      `v2 removida (${pesquisas.length} pesquisa(s) de teste, ${respostas} resposta(s)). ` +
        `Agora rode: npx prisma db seed`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
