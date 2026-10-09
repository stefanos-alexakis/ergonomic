import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Pedido da consultoria (out/2026): o mínimo de respostas para exibir um
 * grupo passa de 5 para 3, inclusive nas pesquisas que já existem. O
 * `db push` do boot só muda o padrão das NOVAS pesquisas — esta é a parte
 * que atualiza os dados. Idempotente: só toca quem ainda está com 5.
 * Uso: npx tsx scripts/minimo-anonimato-3.ts
 */
async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const { count } = await db.pesquisa.updateMany({
    where: { limiteSupressaoGrupo: 5 },
    data: { limiteSupressaoGrupo: 3 },
  });
  console.log(`${count} pesquisa(s) passaram a usar o mínimo de 3 respostas.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
