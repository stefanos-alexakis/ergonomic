import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { normalizarCodigo } from "@/lib/codigo";

/**
 * Protege /admin e /gestor, e cuida de um detalhe crítico de anonimato
 * em /p/*: se o código de acesso vier na URL (QR code do cartão), ele
 * nunca pode ficar lá — fica no histórico do navegador, em logs, e é
 * mandado para qualquer recurso externo que a página carregue
 * (review.md §1.2). Aqui, antes de qualquer página renderizar, o
 * código sai da URL e vai para um cookie de curta duração.
 */
export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith("/p/") && searchParams.has("codigo")) {
    const codigo = normalizarCodigo(searchParams.get("codigo") ?? "");
    const urlLimpa = new URL(pathname, req.nextUrl.origin);
    const resposta = NextResponse.redirect(urlLimpa);
    resposta.cookies.set("codigo_digitado", codigo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: pathname,
      maxAge: 60 * 30,
    });
    return resposta;
  }

  const precisaLogin = pathname.startsWith("/admin") || pathname.startsWith("/gestor");

  if (precisaLogin && !req.auth?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && !req.auth?.user?.isPlatformAdmin) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/gestor/:path*", "/p/:path*"],
};
