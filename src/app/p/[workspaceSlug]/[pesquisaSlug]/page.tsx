import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  resolvePesquisaPublica,
  carregarEstadoJornada,
  carregarPaginasQuestionario,
  carregarRespostasSalvas,
} from "@/lib/resposta";
import { listarCatalogoOrganizacional } from "@/lib/estrutura";
import { FormularioCodigo } from "./formulario-codigo";
import { FormularioOrganizacao } from "./formulario-organizacao";
import { Questionario } from "./questionario";

export const dynamic = "force-dynamic";

export default async function JornadaColaboradorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; pesquisaSlug: string }>;
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { workspaceSlug, pesquisaSlug } = await params;
  const { pagina: paginaParam } = await searchParams;

  const pesquisa = await resolvePesquisaPublica(workspaceSlug, pesquisaSlug);
  if (!pesquisa) notFound();

  const jar = await cookies();
  const codigoDigitado = jar.get("codigo_digitado")?.value;

  // O link é o MESMO em todo cartão da pesquisa (review.md §6.11) — se
  // ele confiasse num cookie de sessão anterior, a próxima pessoa a
  // abrir o mesmo link no mesmo aparelho herdaria a sessão de quem
  // respondeu antes (bug real relatado pelo usuário). Por isso: o link
  // "nu", sem `?pagina=`, SEMPRE pede o código de novo — só confia no
  // cookie quando a navegação já vem de dentro do próprio fluxo (todo
  // redirect interno depois de validar um código usa `?pagina=...`).
  if (!paginaParam) {
    return (
      <FormularioCodigo
        workspaceSlug={workspaceSlug}
        pesquisaSlug={pesquisaSlug}
        valorInicial={codigoDigitado}
      />
    );
  }

  const codigoAcessoId = jar.get("codigoAcessoId")?.value;
  if (!codigoAcessoId) {
    return (
      <FormularioCodigo
        workspaceSlug={workspaceSlug}
        pesquisaSlug={pesquisaSlug}
        valorInicial={codigoDigitado}
      />
    );
  }

  const estado = await carregarEstadoJornada(pesquisa.id, codigoAcessoId);

  if (estado.tipo === "invalido") {
    return (
      <FormularioCodigo
        workspaceSlug={workspaceSlug}
        pesquisaSlug={pesquisaSlug}
        valorInicial={codigoDigitado}
      />
    );
  }

  if (estado.tipo === "encerrada") {
    return (
      <main className="max-w-sm mx-auto mt-24 px-5 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Pesquisa encerrada</h1>
        <p className="text-sm text-zinc-500">O prazo desta pesquisa já terminou. Obrigado pelo interesse.</p>
      </main>
    );
  }

  if (estado.tipo === "concluido") {
    return (
      <main className="max-w-sm mx-auto mt-24 px-5 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Obrigado por participar!</h1>
        <p className="text-sm text-zinc-500">Sua resposta já foi registrada. Você não precisa fazer mais nada.</p>
      </main>
    );
  }

  if (estado.tipo === "selecionar_organizacao") {
    const catalogo = await listarCatalogoOrganizacional(pesquisa.workspaceId);
    return (
      <FormularioOrganizacao
        workspaceSlug={workspaceSlug}
        pesquisaSlug={pesquisaSlug}
        respostaId={estado.respostaId}
        setores={catalogo.setores}
        departamentos={catalogo.departamentos}
      />
    );
  }

  // estado.tipo === "questionario" — paginado. Sem tela de revisão: a
  // última página conclui direto (a pedido do cliente, ver review.md) —
  // salvarPaginaAction já cuida disso no redirect.
  const paginas = await carregarPaginasQuestionario(pesquisa.questionarioId);
  const respostasSalvas = await carregarRespostasSalvas(estado.respostaId);

  const numeroPagina = Math.min(Math.max(Number.parseInt(paginaParam ?? "1", 10) || 1, 1), paginas.length);
  const pagina = paginas[numeroPagina - 1];
  if (!pagina) notFound();

  return (
    // key força remontar o formulário a cada página — sem isso, o React
    // reaproveita a mesma instância (mesma posição na árvore) e o estado
    // interno do useActionState não reseta a tempo: o primeiro clique em
    // "Próximo" de cada página nova era silenciosamente ignorado (achado
    // no E2E desta fase, ver review.md).
    <Questionario
      key={pagina.numeroPagina}
      workspaceSlug={workspaceSlug}
      pesquisaSlug={pesquisaSlug}
      respostaId={estado.respostaId}
      pagina={pagina}
      totalPaginas={paginas.length}
      respostasSalvas={respostasSalvas}
    />
  );
}
