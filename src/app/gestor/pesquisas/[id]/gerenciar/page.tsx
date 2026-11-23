import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { pesquisaIniciada } from "@/lib/gestao-pesquisas";
import { DIAS_CARENCIA_EXCLUSAO, exclusaoDefinitivaLiberada, exclusaoLiberadaEm } from "@/lib/vigencia-pesquisa";
import { paraDatetimeLocal } from "@/lib/datas";
import { AppShell } from "@/components/shell/app-shell";
import { GRUPOS_GESTOR, NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import {
  alterarEncerramentoAction,
  arquivarAction,
  cancelarExclusaoAction,
  desarquivarAction,
  excluirDefinitivamenteAction,
  excluirDiretoAction,
  solicitarExclusaoAction,
} from "./actions";
import { BotaoAcao, ConfirmacaoPorNome, ExcluirDireto, FormEncerramento } from "./formularios";

export const dynamic = "force-dynamic";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-5 mb-5 max-w-2xl">
      <h2 className="text-sm font-semibold text-zinc-900 mb-3">{titulo}</h2>
      {children}
    </section>
  );
}

/** Prorrogar o encerramento, arquivar e excluir a pesquisa. */
export default async function GerenciarPesquisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  const iniciada = await pesquisaIniciada(pesquisa.id);
  const arquivada = pesquisa.arquivadaEm !== null;
  const pedido = pesquisa.exclusaoSolicitadaEm;
  const liberada = exclusaoDefinitivaLiberada(pedido);

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV_GESTOR}
      grupos={GRUPOS_GESTOR}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      logoUrl={workspace.logoUrl}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <PageHeader eyebrow={pesquisa.nome} title="Gerenciar pesquisa" />

      <Secao titulo="Encerramento">
        <p className="text-sm text-zinc-600 mb-4">
          Início em {pesquisa.dataInicio.toLocaleString("pt-BR")}. Para dar mais prazo (por exemplo, depois de um imprevisto
          na empresa), escolha uma nova data: a pesquisa reabre e os códigos ainda não usados voltam a funcionar. Os cartões
          já emitidos continuam valendo.
          {iniciada && " Como a pesquisa já recebeu respostas, o encerramento só pode ser prorrogado, não antecipado."}
        </p>
        {arquivada && (
          <p className="text-sm text-amber-800 mb-3">Desarquive a pesquisa para alterar o encerramento.</p>
        )}
        <FormEncerramento
          acao={alterarEncerramentoAction.bind(null, pesquisa.id)}
          valorInicial={paraDatetimeLocal(pesquisa.dataFim)}
          desabilitado={arquivada}
        />
      </Secao>

      <Secao titulo="Arquivamento">
        {arquivada ? (
          <>
            <p className="text-sm text-zinc-600 mb-3">
              Arquivada em {pesquisa.arquivadaEm!.toLocaleDateString("pt-BR")}: não recebe respostas e não aparece nas
              listas de trabalho, no Painel FRPRT nem no relatório completo. Os dados continuam consultáveis.
            </p>
            {pedido ? (
              <p className="text-sm text-amber-800">Cancele o pedido de exclusão (abaixo) para poder desarquivar.</p>
            ) : (
              <BotaoAcao acao={desarquivarAction.bind(null, pesquisa.id)} rotulo="Desarquivar pesquisa" />
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-600 mb-3">
              Arquivar tira a pesquisa da lista de trabalho e para de aceitar respostas. Dá para desarquivar depois.
            </p>
            <BotaoAcao acao={arquivarAction.bind(null, pesquisa.id)} rotulo="Arquivar pesquisa" />
          </>
        )}
      </Secao>

      <Secao titulo="Excluir pesquisa">
        {!iniciada ? (
          <>
            <p className="text-sm text-zinc-600 mb-3">
              Nenhum código de participante foi usado (os de teste não contam), então a pesquisa pode ser excluída direto,
              junto com os códigos gerados.
            </p>
            <ExcluirDireto acao={excluirDiretoAction.bind(null, pesquisa.id)} />
          </>
        ) : pedido ? (
          <>
            <p className="text-sm text-zinc-700 mb-2" data-testid="exclusao-solicitada">
              Exclusão solicitada em {pedido.toLocaleDateString("pt-BR")}. A pesquisa está arquivada e <strong>não foi
              excluída</strong>.
            </p>
            {liberada ? (
              <>
                <p className="text-sm text-zinc-600 mb-3">
                  O prazo de {DIAS_CARENCIA_EXCLUSAO} dias terminou. Excluir apaga a pesquisa, os códigos, as respostas e a
                  pré-pesquisa, <strong>sem volta</strong>. Os relatórios já emitidos continuam arquivados.
                </p>
                <ConfirmacaoPorNome
                  acao={excluirDefinitivamenteAction.bind(null, pesquisa.id)}
                  nomePesquisa={pesquisa.nome}
                  rotulo="Excluir definitivamente"
                />
              </>
            ) : (
              <p className="text-sm text-zinc-600 mb-3" data-testid="exclusao-prazo">
                A exclusão definitiva fica disponível a partir de {exclusaoLiberadaEm(pedido).toLocaleDateString("pt-BR")}.
              </p>
            )}
            <div className="mt-3">
              <BotaoAcao acao={cancelarExclusaoAction.bind(null, pesquisa.id)} rotulo="Cancelar pedido de exclusão" />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-600 mb-3">
              Esta pesquisa já foi iniciada. Ao solicitar a exclusão, ela <strong>não será excluída imediatamente</strong>:
              fica <strong>arquivada por {DIAS_CARENCIA_EXCLUSAO} dias</strong> e só depois poderá ser excluída, com uma
              segunda confirmação. Até lá, você pode cancelar o pedido. A exclusão definitiva apaga os códigos, as respostas
              e a pré-pesquisa; os relatórios já emitidos continuam arquivados.
            </p>
            <ConfirmacaoPorNome
              acao={solicitarExclusaoAction.bind(null, pesquisa.id)}
              nomePesquisa={pesquisa.nome}
              rotulo="Solicitar exclusão"
            />
          </>
        )}
      </Secao>

      <p className="mt-6">
        <Link href={`/gestor/pesquisas/${pesquisa.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar à pesquisa
        </Link>
      </p>
    </AppShell>
  );
}
