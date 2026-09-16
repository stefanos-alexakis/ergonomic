import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { PesosForm } from "./form";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Empresas" },
  { href: "/admin/perguntas", label: "Pesos das perguntas" },
];

export default async function PerguntasPage() {
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
                include: { perguntas: { orderBy: { ordemGlobal: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  const blocos =
    questionario?.blocos.map((bloco) => ({
      id: bloco.id,
      nome: bloco.nome,
      dimensoes: bloco.dimensoes.map((dimensao) => ({
        id: dimensao.id,
        nome: dimensao.nome,
        perguntas: dimensao.fatoresRisco.flatMap((fator) =>
          fator.perguntas.map((p) => ({
            id: p.id,
            texto: p.texto,
            situacaoInvestigada: p.situacaoInvestigada,
            peso: p.peso,
            ordemGlobal: p.ordemGlobal,
          })),
        ),
      })),
    })) ?? [];

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV}>
      <PageHeader
        eyebrow="Plataforma"
        title="Pesos das perguntas — Score Base (Eixo 1)"
      />
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        Todas as perguntas nascem com peso 1 (mesma influência no cálculo). Aumentar o peso de
        uma pergunta faz ela pesar mais na média — e portanto no Score Base — de quem respondeu.
        Mudanças valem para todas as empresas e recalculam os painéis já existentes na hora,
        inclusive de pesquisas antigas.
      </p>
      {blocos.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum questionário ativo cadastrado.</p>
      ) : (
        <PesosForm blocos={blocos} />
      )}
    </AppShell>
  );
}
