import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoGestor } from "../../eixo2/contexto";
import { IdentificacaoForm } from "../identificacao-form";

export const dynamic = "force-dynamic";

export default async function NovoLevantamentoPage() {
  const { actor, workspace } = await contextoGestor();
  // Sugestão: últimos 12 meses (o modelo do Eixo 3 pede esse recorte).
  const fim = new Date();
  const inicio = new Date(Date.UTC(fim.getUTCFullYear() - 1, fim.getUTCMonth(), fim.getUTCDate() + 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <div className="max-w-2xl">
        <PageHeader eyebrow="Eixo 3 · Atestados CID-F" title="Publicar planilha de ocorrências" />
        <IdentificacaoForm
          inicial={{
            nome: `Atestados ${fim.getUTCFullYear()}`,
            periodoInicio: iso(inicio),
            periodoFim: iso(fim),
            responsavel: "",
            cargoResponsavel: "",
          }}
        />
      </div>
    </ShellGestor>
  );
}
