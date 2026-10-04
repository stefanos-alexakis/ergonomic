import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { NovaPesquisaForm } from "./form";

export const dynamic = "force-dynamic";

const NAV = NAV_GESTOR;

export default async function NovaPesquisaPage() {
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      logoUrl={workspace.logoUrl}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <div className="max-w-md">
        <PageHeader title="Nova pesquisa" />
        <NovaPesquisaForm />
      </div>
    </AppShell>
  );
}
