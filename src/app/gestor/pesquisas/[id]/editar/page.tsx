import { notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { EditarOrientacaoForm } from "./form";
import { valoresDaPesquisa } from "../../campos-orientacao";

export const dynamic = "force-dynamic";

export default async function EditarPesquisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV_GESTOR}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      logoUrl={workspace.logoUrl}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <div className="max-w-md">
        <PageHeader eyebrow={pesquisa.nome} title="Orientação e pré-pesquisa" />
        <EditarOrientacaoForm pesquisaId={pesquisa.id} valores={valoresDaPesquisa(pesquisa)} />
      </div>
    </AppShell>
  );
}
