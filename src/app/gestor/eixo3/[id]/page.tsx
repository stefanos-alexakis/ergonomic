import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { resolverLevantamento, setoresDaPlanilha } from "@/lib/levantamento-eixo3";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { contextoGestor } from "../../eixo2/contexto";
import { excluirLevantamentoAction, reabrirLevantamentoAction } from "../actions";
import { EnvioPlanilha } from "./envio-planilha";
import { SetoresPlanilha } from "./setores-planilha";
import { PublicarForm } from "./publicar-form";
import { PainelEixo3 } from "./painel-eixo3";

export const dynamic = "force-dynamic";

const data = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

function Etapa({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-sm font-semibold text-zinc-900 mb-3">
        <span className="text-zinc-400 mr-1">{numero}.</span> {titulo}
      </h2>
      {children}
    </Card>
  );
}

export default async function LevantamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setor?: string; relacao?: string }>;
}) {
  const { id } = await params;
  const { setor, relacao } = await searchParams;
  const { actor, workspace } = await contextoGestor();
  const l = await resolverLevantamento(id, workspace.id);
  if (!l) notFound();

  const publicado = l.status === "PUBLICADO";
  const cabecalho = (
    <PageHeader
      eyebrow="Eixo 3 · Atestados CID-F"
      title={l.nome}
      actions={
        publicado ? (
          <form action={reabrirLevantamentoAction.bind(null, l.id)}>
            <Button type="submit" variant="secondary">
              Reabrir para editar
            </Button>
          </form>
        ) : (
          <Link href={`/gestor/eixo3/${l.id}/identificacao`}>
            <Button variant="ghost">Editar identificação</Button>
          </Link>
        )
      }
    />
  );

  const identificacao = (
    <p className="text-sm text-zinc-600 mb-6">
      Período: <strong>{data(l.periodoInicio)} a {data(l.periodoFim)}</strong>
      {l.responsavel && (
        <>
          {" "}
          · Responsável: <strong>{l.responsavel}</strong>
          {l.cargoResponsavel ? ` (${l.cargoResponsavel})` : ""}
        </>
      )}
      {l.arquivoNome && <> · Arquivo: {l.arquivoNome}</>}
      {publicado && l.declaracaoAceitaEm && (
        <> · Publicado com declaração de veracidade em {l.declaracaoAceitaEm.toLocaleString("pt-BR")}</>
      )}
    </p>
  );

  if (publicado) {
    return (
      <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
        {cabecalho}
        {identificacao}
        <PainelEixo3
          levantamentoId={l.id}
          workspaceId={workspace.id}
          filtroSetor={setor}
          filtroRelacao={relacao}
          caminhoBase={`/gestor/eixo3/${l.id}`}
        />
      </ShellGestor>
    );
  }

  const [grupos, setores, foraDoPeriodo] = await Promise.all([
    setoresDaPlanilha(l.id),
    db.setorOrg.findMany({ where: { workspaceId: workspace.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.ocorrenciaEixo3.count({
      where: {
        levantamentoId: l.id,
        ignorada: false,
        OR: [{ dataInicio: { lt: l.periodoInicio } }, { dataInicio: { gt: l.periodoFim } }],
      },
    }),
  ]);
  const pendentes = grupos.filter((g) => !g.setorId && !g.ignorada).length;
  const totalLinhas = grupos.filter((g) => !g.ignorada).reduce((a, g) => a + g.linhas, 0);
  const podePublicar = Boolean(l.arquivoNome) && pendentes === 0;

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      {cabecalho}
      {identificacao}

      <div className="flex flex-col gap-6">
        <Etapa numero={1} titulo="Planilha de ocorrências">
          <EnvioPlanilha levantamentoId={l.id} jaEnviada={Boolean(l.arquivoNome)} />
          {l.arquivoNome && (
            <p className="text-sm text-zinc-600 mt-3">
              Planilha atual: <strong>{l.arquivoNome}</strong> — {totalLinhas} ocorrência(s) a publicar.
            </p>
          )}
        </Etapa>

        {grupos.length > 0 && (
          <Etapa numero={2} titulo="Setores da planilha">
            <p className="text-sm text-zinc-500 mb-3">
              Nomes iguais ao cadastro foram associados automaticamente.{" "}
              {pendentes > 0 ? (
                <strong className="text-amber-700">{pendentes} nome(s) precisam de decisão.</strong>
              ) : (
                "Tudo associado."
              )}
            </p>
            <SetoresPlanilha levantamentoId={l.id} grupos={grupos} setores={setores} />
          </Etapa>
        )}

        {l.arquivoNome && pendentes === 0 && totalLinhas > 0 && (
          <Etapa numero={3} titulo="Prévia do resultado">
            {foraDoPeriodo > 0 && (
              <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {foraDoPeriodo} ocorrência(s) com data de início fora do período informado — confira a planilha ou o
                período.
              </p>
            )}
            <PainelEixo3
              levantamentoId={l.id}
              workspaceId={workspace.id}
              filtroSetor={setor}
              filtroRelacao={relacao}
              caminhoBase={`/gestor/eixo3/${l.id}`}
            />
          </Etapa>
        )}

        <Etapa numero={l.arquivoNome && pendentes === 0 && totalLinhas > 0 ? 4 : 3} titulo="Publicar">
          {l.arquivoNome && totalLinhas === 0 && (
            <p className="text-sm text-zinc-600 mb-3">
              A planilha não tem ocorrências: o levantamento registra que não houve atestados CID-F no período.
            </p>
          )}
          <PublicarForm
            levantamentoId={l.id}
            podePublicar={podePublicar}
            responsavel={l.responsavel ?? ""}
            cargoResponsavel={l.cargoResponsavel ?? ""}
          />
        </Etapa>

        <form action={excluirLevantamentoAction.bind(null, l.id)} className="self-start">
          <button type="submit" className="text-sm text-zinc-400 hover:text-red-600 cursor-pointer">
            Excluir este rascunho
          </button>
        </form>
      </div>
    </ShellGestor>
  );
}
