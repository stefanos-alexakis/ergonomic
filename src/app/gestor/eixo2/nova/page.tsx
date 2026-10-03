import { db } from "@/lib/db";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoGestor } from "../contexto";
import { NovaAvaliacaoForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NovaAvaliacaoPage() {
  const { actor, workspace } = await contextoGestor();
  const setores = await db.setorOrg.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const hoje = new Date();
  const sugestaoNome = `Avaliação ${hoje.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "")}`;

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <div className="max-w-2xl">
        <PageHeader eyebrow="Eixo 2 · Medidas de controle" title="Nova avaliação" />
        <NovaAvaliacaoForm setores={setores} sugestaoNome={sugestaoNome} />
      </div>
    </ShellGestor>
  );
}
