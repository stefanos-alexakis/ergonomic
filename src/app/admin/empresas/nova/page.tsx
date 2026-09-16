import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { NovaEmpresaForm } from "./form";

const NAV = [
  { href: "/admin", label: "Empresas" },
  { href: "/admin/perguntas", label: "Pesos das perguntas" },
];

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
