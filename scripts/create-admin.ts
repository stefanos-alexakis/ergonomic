import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/**
 * Bootstrap do primeiro Administrador da plataforma (tasks.md Fase 2).
 * Uso: EMAIL=... SENHA=... NOME=... npx tsx scripts/create-admin.ts
 */
async function main() {
  const email = process.env.EMAIL;
  const senha = process.env.SENHA;
  const nome = process.env.NOME ?? "Administrador";

  if (!email || !senha) {
    console.error("Uso: EMAIL=admin@exemplo.com SENHA=senhaForte NOME=\"Nome\" npx tsx scripts/create-admin.ts");
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error("Senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await bcrypt.hash(senha, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { isPlatformAdmin: true, passwordHash, nome },
    create: { email, nome, passwordHash, isPlatformAdmin: true },
  });

  console.log(`Administrador pronto: ${admin.email} (id ${admin.id}).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
