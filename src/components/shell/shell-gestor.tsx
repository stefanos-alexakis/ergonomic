import type { ReactNode } from "react";
import type { Workspace } from "@prisma/client";
import { AppShell } from "./app-shell";
import { BannerImpersonacao } from "./banner-impersonacao";
import { NAV_GESTOR } from "./nav-gestor";

/**
 * AppShell já configurado para a área do gestor: menu, cores da empresa e
 * o aviso de "visão de gestor" quando é um admin impersonando.
 */
export function ShellGestor({
  workspace,
  isPlatformAdmin,
  children,
}: {
  workspace: Workspace;
  isPlatformAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV_GESTOR}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      banner={isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      {children}
    </AppShell>
  );
}
