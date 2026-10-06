import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { compararPorNumeroDaDimensao } from "@/lib/dashboard";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { SeveridadeForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SeveridadePage() {
  // Não depender só do middleware — mesmo padrão da tela de pesos.
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) notFound();

  const dimensoes = await db.dimensao.findMany({
    where: { bloco: { questionario: { ativo: true } } },
    select: { id: true, nome: true, severidade: { select: { severidade: true, justificativa: true, atualizadoEm: true } } },
  });
  const itens = dimensoes
    .sort(compararPorNumeroDaDimensao)
    .map((d) => ({
      dimensaoId: d.id,
      nome: d.nome,
      severidade: d.severidade?.severidade ?? null,
      justificativa: d.severidade?.justificativa ?? null,
    }));
  const ultimaAtualizacao = dimensoes
    .map((d) => d.severidade?.atualizadoEm)
    .filter((x): x is Date => Boolean(x))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV_ADMIN}>
      <PageHeader eyebrow="Metodologia · FMEA" title="Severidade dos fatores" />
      <div className="mb-6 max-w-3xl flex flex-col gap-2 text-sm text-zinc-600">
        <p>
          Severidade-base de cada fator (1 a 5), pela gravidade do dano típico à saúde. Vale para todas as empresas e
          entra na classificação FMEA do Painel FRPRT. No setor, ela é agravada (+1 cada, até 5) por atestado CID-F
          relacionado ao trabalho, afastamento acima de 15 dias e 50% ou mais dos respondentes expostos.
        </p>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          Para constar no PGR, esta tabela deve refletir a validação do profissional de SST responsável (NR-1, item
          1.5.4.4.2). A justificativa aparece nos relatórios como critério documentado.
        </p>
        {ultimaAtualizacao && (
          <p className="text-xs text-zinc-500">Última alteração: {ultimaAtualizacao.toLocaleString("pt-BR")}</p>
        )}
      </div>
      <div className="max-w-3xl">
        <SeveridadeForm itens={itens} />
      </div>
    </AppShell>
  );
}
