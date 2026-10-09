import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { carregarParametrosMetodologia } from "../src/lib/relatorio/parametros";
import { metodologiaEmMarkdown } from "../src/lib/relatorio/metodologia";
import { db } from "../src/lib/db";

/**
 * Gera docs/metodologia-final.md a partir da MESMA fonte do relatório
 * completo (src/lib/relatorio/metodologia.ts), com os valores vigentes no
 * banco (prazos, severidades, situações do PGR).
 * Uso: npx tsx scripts/gerar-metodologia.ts
 */
async function main() {
  const md = metodologiaEmMarkdown(await carregarParametrosMetodologia());
  const destino = join(process.cwd(), "docs", "metodologia-final.md");
  writeFileSync(
    destino,
    `<!-- Gerado por scripts/gerar-metodologia.ts — não edite à mão; edite src/lib/relatorio/metodologia.ts. -->\n\n${md}`,
  );
  console.log(`Gerado: ${destino}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
