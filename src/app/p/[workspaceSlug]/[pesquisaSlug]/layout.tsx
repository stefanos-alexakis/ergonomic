import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import { resolveWorkspacePublico } from "@/lib/resposta";

export default async function JornadaLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await resolveWorkspacePublico(workspaceSlug);
  if (!workspace) notFound();

  // Empresa sem cor cadastrada usa o tema cinza/preto padrão (spec.md §3) —
  // cada consumidor de --ws-line/--ws-accent/--ws-secondary já traz esse
  // fallback embutido (ex: border-[var(--ws-line,#D4D4D8)]), então aqui só
  // setamos a variável quando existe cor de verdade, sem repetir a lógica
  // de fallback. --ws-secondary cobre as áreas cinza-claras (ex: trilho da
  // barra de progresso) — de propósito NÃO cai de volta para corPrimaria
  // quando falta corSecundaria: senão o trilho ficaria da mesma cor do
  // preenchimento (--ws-accent) e a barra de progresso sumiria visualmente.
  const temaEmpresa: CSSProperties | undefined =
    workspace.corPrimaria || workspace.corSecundaria
      ? ({
          "--ws-line": workspace.corPrimaria ?? undefined,
          "--ws-accent": workspace.corPrimaria ?? undefined,
          "--ws-secondary": workspace.corSecundaria ?? undefined,
        } as CSSProperties)
      : undefined;

  return (
    <div className="min-h-screen bg-white" style={temaEmpresa}>
      <header className="flex items-center gap-3 px-5 py-4 border-b-2 border-[var(--ws-line,#D4D4D8)]">
        {workspace.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={workspace.logoUrl} alt={workspace.nome} className="h-8 w-auto object-contain" />
        )}
        <span className="font-semibold text-zinc-900">{workspace.nome}</span>
      </header>
      {children}
    </div>
  );
}
