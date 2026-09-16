import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { listarCatalogoOrganizacional } from "@/lib/estrutura";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AdicionarItemForm } from "./adicionar-item-form";
import { ImportarPlanilhaForm } from "./importar-planilha-form";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e funções" }];

const ROTULOS = {
  setor: "Setores",
  departamento: "Departamentos",
  segmento: "Segmentos",
  funcao: "Funções",
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
    segmento: catalogo.segmentos,
    funcao: catalogo.funcoes,
  } as const;

  return (
    <AppShell contexto={workspace.nome} homeHref="/gestor" nav={NAV} accentColor={workspace.corPrimaria} secondaryColor={workspace.corSecundaria}>
      <PageHeader
        title="Setores, departamentos, segmentos e funções"
      />
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        Cadastre um por um ou importe uma planilha .xlsx com as colunas &quot;Setor&quot;,
        &quot;Departamento&quot;, &quot;Segmento&quot; e &quot;Função&quot; (uma aba, cabeçalho na
        primeira linha).
      </p>

      <ImportarPlanilhaForm />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
        {(["setor", "departamento", "segmento", "funcao"] as const).map((tipo) => (
          <Card key={tipo}>
            <h2 className="text-sm font-semibold text-zinc-900 mb-3">{ROTULOS[tipo]}</h2>
            <AdicionarItemForm tipo={tipo} />
            {itensPorTipo[tipo].length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 border-t border-zinc-100 pt-3">
                {itensPorTipo[tipo].map((item) => (
                  <li key={item.id} className="text-sm text-zinc-700">
                    {item.nome}
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
