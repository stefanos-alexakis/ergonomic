import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 moveu a config de seed do "prisma.seed" no package.json
    // (ainda existe ali, mas não é mais lido) pra cá — sem isso, `npx
    // prisma db seed` falha com "No seed command configured" mesmo com
    // tudo certo no package.json (achado rodando a imagem de produção
    // de verdade, não só localmente com `npm run db:seed`, que chama
    // tsx direto e por isso nunca passou por esse caminho).
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env["DATABASE_URL"] ??
      "postgresql://placeholder:placeholder@localhost:5432/pesquisa",
  },
});
