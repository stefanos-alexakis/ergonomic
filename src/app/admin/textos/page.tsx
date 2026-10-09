import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { TEXTOS_RELATORIO } from "@/lib/textos-relatorio";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { TextoForm } from "./form";

export const dynamic = "force-dynamic";

export default async function TextosPage() {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) notFound();
  const legislacao = await db.textoRelatorio.findUnique({ where: { chave: "LEGISLACAO" } });

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV_ADMIN}>
      <PageHeader eyebrow="Relatório completo" title="Textos do relatório" />
      <div className="max-w-3xl flex flex-col gap-4">
        <p className="text-sm text-zinc-600">
          Textos fixos que entram no relatório completo de todas as empresas. A metodologia é gerada pelo sistema com as
          regras vigentes; o dossiê da legislação é mantido aqui.
        </p>
        <section aria-label={TEXTOS_RELATORIO.LEGISLACAO.titulo} className="rounded-lg border border-zinc-200 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">{TEXTOS_RELATORIO.LEGISLACAO.titulo}</h2>
          <p className="text-xs text-zinc-500 mb-3">
            {legislacao?.conteudo.trim()
              ? `Atualizado em ${legislacao.atualizadoEm.toLocaleString("pt-BR")}${legislacao.atualizadoPor ? ` por ${legislacao.atualizadoPor}` : ""}.`
              : `Vazio — o relatório mostra: “${TEXTOS_RELATORIO.LEGISLACAO.vazio}”`}
          </p>
          <TextoForm chave="LEGISLACAO" titulo={TEXTOS_RELATORIO.LEGISLACAO.titulo} conteudo={legislacao?.conteudo ?? ""} />
        </section>
      </div>
    </AppShell>
  );
}
