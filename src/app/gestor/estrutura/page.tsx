import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { listarCatalogoOrganizacional } from "@/lib/estrutura";
import { AppShell } from "@/components/shell/app-shell";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AdicionarItemForm } from "./adicionar-item-form";
import { ImportarPlanilhaForm } from "./importar-planilha-form";
import { ItemCatalogo } from "./item-catalogo";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e departamentos" }];

const ROTULOS = {
  setor: "Setores",
  departamento: "Departamentos",
} as const;

export default async function EstruturaPage() {
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;

  const catalogo = await listarCatalogoOrganizacional(workspace.id);
  const itensPorTipo = {
    setor: catalogo.setores,
    departamento: catalogo.departamentos,
  } as const;

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <PageHeader title="Setores e departamentos" />
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        Cadastre um por um ou importe uma planilha .xlsx com as colunas &quot;Setor&quot; e
        &quot;Departamento&quot; (uma aba, cabeçalho na primeira linha).{" "}
        <a href="/gestor/estrutura/modelo" className="text-zinc-700 underline hover:text-zinc-900">
          Baixar modelo de planilha
        </a>
        .
      </p>

      <ImportarPlanilhaForm />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
        {(["setor", "departamento"] as const).map((tipo) => (
          <Card key={tipo}>
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">{ROTULOS[tipo]}</h2>
            <AdicionarItemForm tipo={tipo} />
            {itensPorTipo[tipo].length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-zinc-100 pt-3">
                {itensPorTipo[tipo].map((item) => (
                  <li key={item.id}>
                    <ItemCatalogo tipo={tipo} id={item.id} nome={item.nome} totalRespostas={item._count.respostas} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
