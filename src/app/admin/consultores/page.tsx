import { notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { listarConsultores } from "@/lib/consultores";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { ConsultorForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ConsultoresPage() {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) notFound();
  const consultores = await listarConsultores();

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV_ADMIN}>
      <PageHeader eyebrow="Relatório completo" title="Consultores" />
      <div className="max-w-3xl flex flex-col gap-6">
        <p className="text-sm text-zinc-600">
          Quem assina o relatório completo. O cadastro vale para todas as empresas; em cada relatório o consultor escolhe
          quem assina. Relatórios já emitidos guardam uma cópia destes dados — editar ou excluir aqui não os altera.
        </p>
        <section aria-label="Novo consultor">
          <h2 className="text-sm font-semibold text-zinc-900 mb-2">Novo consultor</h2>
          <ConsultorForm />
        </section>
        <section aria-label="Consultores cadastrados">
          <h2 className="text-sm font-semibold text-zinc-900 mb-2">Cadastrados ({consultores.length})</h2>
          {consultores.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum consultor cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {consultores.map((c) => (
                <ConsultorForm
                  key={`${c.id}-${c.atualizadoEm.getTime()}`}
                  id={c.id}
                  valores={{ nome: c.nome, formacao: c.formacao, registro: c.registro, cargo: c.cargo, email: c.email }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
