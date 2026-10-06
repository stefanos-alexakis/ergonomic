import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { NovaEmpresaForm } from "./form";

const NAV = NAV_ADMIN;

export default function NovaEmpresaPage() {
  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV}>
      <div className="max-w-lg">
        <PageHeader eyebrow="Plataforma" title="Nova empresa cliente" />
        <NovaEmpresaForm />
      </div>
    </AppShell>
  );
}
