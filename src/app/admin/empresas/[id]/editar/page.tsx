import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { carregarEmpresaOuNotFound } from "./actions";
import { EditarEmpresaForm } from "./form";
import { RedefinirSenhaForm } from "./redefinir-senha-form";
import { ExcluirEmpresaForm } from "./excluir-empresa-form";
import { resumoParaExcluir } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const NAV = NAV_ADMIN;

export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace, gestor } = await carregarEmpresaOuNotFound(id);
  const resumo = workspace.isActive ? null : await resumoParaExcluir(workspace.id);

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV}>
      <div className="max-w-lg">
        <PageHeader eyebrow="Plataforma" title={workspace.nome} />
        <div className="flex flex-col gap-6">
          <EditarEmpresaForm workspace={workspace} gestor={gestor} />
          {gestor && <RedefinirSenhaForm gestorId={gestor.id} />}
          <ExcluirEmpresaForm
            workspaceId={workspace.id}
            nome={workspace.nome}
            ativa={workspace.isActive}
            resumo={resumo ?? { pesquisas: 0, respostas: 0, avaliacoesEixo2: 0, levantamentosEixo3: 0, acoesPlano: 0, gestores: 0 }}
          />
        </div>
      </div>
    </AppShell>
  );
}
