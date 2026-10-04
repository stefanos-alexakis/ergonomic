import { notFound } from "next/navigation";
import { resolverLevantamento } from "@/lib/levantamento-eixo3";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoGestor } from "../../../eixo2/contexto";
import { IdentificacaoForm } from "../../identificacao-form";

export const dynamic = "force-dynamic";

export default async function IdentificacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, workspace } = await contextoGestor();
  const l = await resolverLevantamento(id, workspace.id);
  if (!l) notFound();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <div className="max-w-2xl">
        <PageHeader eyebrow={l.nome} title="Identificação do levantamento" />
        <IdentificacaoForm
          levantamentoId={l.id}
          inicial={{
            nome: l.nome,
            periodoInicio: iso(l.periodoInicio),
            periodoFim: iso(l.periodoFim),
            responsavel: l.responsavel ?? "",
            cargoResponsavel: l.cargoResponsavel ?? "",
          }}
        />
      </div>
    </ShellGestor>
  );
}
