import { notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { carregarRegrasPrazo } from "@/lib/prazos";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { PrazosForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PrazosPage() {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) notFound();
  const regras = await carregarRegrasPrazo();

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV_ADMIN}>
      <PageHeader eyebrow="Metodologia · FMEA" title="Prazos padrão por prioridade" />
      <div className="max-w-3xl flex flex-col gap-4">
        <p className="text-sm text-zinc-600">
          Prazos sugeridos para cada prioridade da Matriz FMEA, contados da data de emissão. Valem para todas as empresas:
          aparecem no Painel FRPRT e no relatório quando o fator ainda não tem ação, e preenchem os prazos iniciais das
          ações geradas no Plano de ação — que cada empresa ajusta ação por ação. Deixe o plano em branco para "manter e
          monitorar os controles".
        </p>
        <PrazosForm regras={regras} />
      </div>
    </AppShell>
  );
}
