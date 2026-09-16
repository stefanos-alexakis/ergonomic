"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";

export async function autenticar(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = formData.get("email");

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return "E-mail ou senha incorretos.";
    }
    throw err;
  }

  // Destino depende de QUEM logou. Não dá para ler a sessão recém-criada
  // aqui: o cookie que o signIn acabou de gerar vai no cabeçalho da
  // RESPOSTA desta action, não no que esta mesma requisição já recebeu
  // — chamar auth() nesse ponto ainda vê a sessão antiga (ou nenhuma),
  // e todo login caía em "/gestor" por engano. Em vez disso, decide pelo
  // que já sabemos: o e-mail que a pessoa acabou de autenticar com.
  const callbackUrl = formData.get("callbackUrl") as string | null;
  if (callbackUrl) {
    redirect(callbackUrl);
  }
  const user = typeof email === "string" ? await db.user.findUnique({ where: { email } }) : null;
  redirect(user?.isPlatformAdmin ? "/admin" : "/gestor");
}
