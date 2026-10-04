import type { CSSProperties, ReactNode } from "react";
import { contrasteEntre } from "@/lib/validation";
import { Topbar } from "./topbar";
import type { ItemNav } from "./nav-gestor";

/** Texto legível sobre a cor primária: branco ou quase-preto, o que contrastar mais. */
function textoSobre(hex: string): string {
  return contrasteEntre(hex, "#ffffff") >= contrasteEntre(hex, "#18181b") ? "#ffffff" : "#18181b";
}

export function AppShell({
  contexto,
  homeHref,
  userLabel,
  nav,
  logoUrl,
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
  nav: ItemNav[];
  // Logo da empresa (workspace.logoUrl) — aparece no canto da barra superior.
  logoUrl?: string | null;
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
          "--ws-on-accent": accentColor ? textoSobre(accentColor) : undefined,
          "--ws-secondary": secondaryColor ?? undefined,
        } as CSSProperties)
      : undefined;

  return (
    <div className="min-h-screen bg-white" style={temaEmpresa}>
      <Topbar contexto={contexto} homeHref={homeHref} userLabel={userLabel} nav={nav} logoUrl={logoUrl} />
      {banner}
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
