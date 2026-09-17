import type { CSSProperties, ReactNode } from "react";
import { Topbar } from "./topbar";

export function AppShell({
  contexto,
  homeHref,
  userLabel,
  nav,
  accentColor,
  secondaryColor,
  banner,
  children,
}: {
  contexto: string;
  // Página inicial da área (/admin ou /gestor) — o nome/logo da barra
  // superior vira link pra lá, dando um jeito de voltar de qualquer
  // subpágina (usuário reparou que não existia — antes não tinha volta).
  homeHref: string;
  userLabel?: string;
  nav: { href: string; label: string }[];
  // Cores cadastradas da empresa do gestor logado (workspace.corPrimaria/
  // corSecundaria). Admin não passa isso — gerencia várias empresas, sem
  // cor única.
  accentColor?: string | null;
  secondaryColor?: string | null;
  // Faixa opcional entre a Topbar e o conteúdo — hoje só o aviso de
  // impersonação (src/components/shell/banner-impersonacao.tsx), mas
  // deixado genérico caso surja outro aviso de contexto no futuro.
  banner?: ReactNode;
  children: ReactNode;
}) {
  const temaEmpresa: CSSProperties | undefined =
    accentColor || secondaryColor
      ? ({
          "--ws-line": accentColor ?? undefined,
          "--ws-accent": accentColor ?? undefined,
          "--ws-secondary": secondaryColor ?? undefined,
        } as CSSProperties)
      : undefined;

  return (
    <div className="min-h-screen bg-white" style={temaEmpresa}>
      <Topbar contexto={contexto} homeHref={homeHref} userLabel={userLabel} nav={nav} />
      {banner}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
