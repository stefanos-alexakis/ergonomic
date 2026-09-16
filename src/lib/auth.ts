import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Login só para Administrador da plataforma e Gestor da empresa. O
 * colaborador respondente NUNCA passa por aqui — anonimato é requisito
 * de constituição, não um detalhe de UX (constitution.md §1).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const senhaValida = await bcrypt.compare(password, user.passwordHash);
        if (!senhaValida) return null;

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          isPlatformAdmin: user.isPlatformAdmin,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isPlatformAdmin = (user as { isPlatformAdmin?: boolean }).isPlatformAdmin ?? false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.isPlatformAdmin = token.isPlatformAdmin as boolean;
      return session;
    },
  },
});
