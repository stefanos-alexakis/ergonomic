import { db } from "@/lib/db";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoAvaliacao } from "../../contexto";
import { SetoresForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SetoresAvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, workspace, avaliacao, setores } = await contextoAvaliacao(id);
  const todos = await db.setorOrg.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <div className="max-w-2xl">
        <PageHeader eyebrow={avaliacao.nome} title="Setores desta avaliação" />
        <SetoresForm avaliacaoId={avaliacao.id} todos={todos} selecionados={setores.map((s) => s.id)} />
      </div>
    </ShellGestor>
  );
}
