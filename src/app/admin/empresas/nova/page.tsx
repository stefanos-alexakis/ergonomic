import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { NovaEmpresaForm } from "./form";

export default function NovaEmpresaPage() {
  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={[{ href: "/admin", label: "Empresas" }]}>
      <div className="max-w-lg">
        <PageHeader eyebrow="Plataforma" title="Nova empresa cliente" />
        <NovaEmpresaForm />
      </div>
    </AppShell>
  );
}
