import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { carregarEmpresaOuNotFound } from "./actions";
import { EditarEmpresaForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace, gestor } = await carregarEmpresaOuNotFound(id);

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={[{ href: "/admin", label: "Empresas" }]}>
      <div className="max-w-lg">
        <PageHeader eyebrow="Plataforma" title={workspace.nome} />
        <EditarEmpresaForm workspace={workspace} gestor={gestor} />
      </div>
    </AppShell>
  );
}
