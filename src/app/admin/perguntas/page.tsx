import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { PesosForm } from "./form";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Empresas", icone: "empresas" as const, ativoEm: ["/admin/empresas"] },
  { href: "/admin/perguntas", label: "Pesos das perguntas", icone: "pesos" as const },
];

export default async function PerguntasPage({ searchParams }: { searchParams: Promise<{ eixo?: string }> }) {
  // Não depender só do middleware — mesmo padrão de carregarEmpresaOuNotFound.
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) notFound();

  const eixo: 1 | 2 = (await searchParams).eixo === "2" ? 2 : 1;

  const questionario = await db.questionario.findFirst({
    where: { ativo: true },
    include: {
      blocos: {
        orderBy: { ordem: "asc" },
        include: {
          dimensoes: {
            orderBy: { ordem: "asc" },
            include: {
              fatoresRisco: {
                include: {
                  perguntas: { orderBy: { ordemGlobal: "asc" }, include: { questaoEixo2: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // Eixo 2: mesma árvore (as questões herdam dimensão da pergunta do Eixo 1),
  // trocando cada pergunta pela questão do Eixo 2 ligada a ela.
  const blocos =
    questionario?.blocos.map((bloco) => ({
      id: bloco.id,
      nome: bloco.nome,
      dimensoes: bloco.dimensoes.map((dimensao) => ({
        id: dimensao.id,
        nome: dimensao.nome,
        perguntas: dimensao.fatoresRisco.flatMap((fator) =>
          fator.perguntas.flatMap((p) => {
            if (eixo === 1) {
              return [
                { id: p.id, texto: p.texto, situacaoInvestigada: p.situacaoInvestigada, peso: p.peso, ordemGlobal: p.ordemGlobal },
              ];
            }
            const q = p.questaoEixo2;
            return q
              ? [{ id: q.id, texto: q.texto, situacaoInvestigada: p.situacaoInvestigada, peso: q.peso, ordemGlobal: q.ordem }]
              : [];
          }),
        ),
      })),
    })) ?? [];

  const aba = (n: 1 | 2, rotulo: string) => (
    <Link
      href={n === 1 ? "/admin/perguntas" : "/admin/perguntas?eixo=2"}
      aria-current={eixo === n ? "page" : undefined}
      className={`px-3 py-1.5 text-sm rounded-md border ${
        eixo === n ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
      }`}
    >
      {rotulo}
    </Link>
  );

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV}>
      <PageHeader
        eyebrow="Plataforma"
        title={`Pesos das perguntas — ${eixo === 1 ? "Score Base (Eixo 1)" : "Medidas de controle (Eixo 2)"}${
          questionario ? ` · versão ${questionario.versao}` : ""
        }`}
      />
      <nav className="flex gap-2 mb-6" aria-label="Eixo">
        {aba(1, "Eixo 1 · Percepção")}
        {aba(2, "Eixo 2 · Medidas de controle")}
      </nav>
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        {eixo === 1
          ? "Todas as perguntas nascem com peso 1 (mesma influência no cálculo). Aumentar o peso de uma pergunta faz ela pesar mais na média — e portanto no Score Base — de quem respondeu."
          : "Peso de cada medida no fator do Eixo 2 (média ponderada das medidas do fator, por setor). Com todos em 1, o cálculo é exatamente a média da metodologia."}{" "}
        Os pesos abaixo são do questionário em uso e valem para todas as empresas, recalculando na
        hora os resultados desta versão. Pesquisas e avaliações de versões anteriores mantêm os
        pesos daquela versão.
      </p>
      {blocos.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum questionário ativo cadastrado.</p>
      ) : (
        <PesosForm key={eixo} blocos={blocos} eixo={eixo} />
      )}
    </AppShell>
  );
}
