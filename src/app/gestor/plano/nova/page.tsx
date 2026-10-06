import Link from "next/link";
import { db } from "@/lib/db";
import { carregarRegrasPrazo } from "@/lib/prazos";
import { calcularPrazos, type Prioridade } from "@/lib/fmea";
import { dataIso, diaDe } from "@/lib/plano-acao-util";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoGestor } from "../../eixo2/contexto";
import { FormularioAcao } from "../formulario-acao";
import { fatoresAtivos, setoresDaEmpresa } from "../dados";

export const dynamic = "force-dynamic";

/**
 * Nova ação manual. Vindo de "Criar ação" de um fator do PGR, chega com
 * setor, fator e prioridade: já preenche onde, o quê sugerido e prazos.
 */
export default async function NovaAcaoPage({
  searchParams,
}: {
  searchParams: Promise<{ setor?: string; fator?: string; prioridade?: string }>;
}) {
  const sp = await searchParams;
  const { actor, workspace } = await contextoGestor();
  const [fatores, setores, regras] = await Promise.all([fatoresAtivos(), setoresDaEmpresa(workspace.id), carregarRegrasPrazo()]);

  const setorOk = setores.some((s) => s.id === sp.setor) ? sp.setor! : null;
  const fatorOk = fatores.some((f) => f.id === sp.fator) ? sp.fator! : null;
  const prioridade = (["ALTA", "MEDIA", "BAIXA"] as const).includes(sp.prioridade as Prioridade) ? (sp.prioridade as Prioridade) : null;
  const hoje = diaDe(new Date());
  const prazos = prioridade ? calcularPrazos(prioridade, hoje, regras) : null;

  // Sugestão de "o quê": primeira tratativa do catálogo do Eixo 2 para o fator.
  const sugestao = fatorOk
    ? await db.questaoEixo2.findFirst({
        where: { planoSugerido: { not: null }, perguntaEixo1: { fatorRisco: { dimensaoId: fatorOk } } },
        orderBy: { ordem: "asc" },
        select: { planoSugerido: true },
      })
    : null;
  const primeiraSugestao = (sugestao?.planoSugerido ?? "").split("\n").map((l) => l.replace(/^-\s*/, "").trim()).find(Boolean) ?? "";

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader eyebrow="Plano de ação" title="Nova ação" />
      <div className="max-w-3xl">
        <FormularioAcao
          valores={{
            oque: primeiraSugestao,
            porque: "",
            como: "",
            responsavel: "",
            cargoResponsavel: "",
            inicio: dataIso(hoje),
            prazo: prazos ? dataIso(prazos.implantacao ?? prazos.plano) : "",
            reavaliarEm: dataIso(prazos?.reavaliacao ?? calcularPrazos("BAIXA", hoje, regras).reavaliacao),
            custo: "",
            custoObservacao: "",
            dimensaoId: fatorOk ?? "",
            setorIds: setorOk ? [setorOk] : [],
          }}
          setores={setores}
          fatores={fatores}
        />
        <p className="mt-6">
          <Link href="/gestor/plano" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Voltar ao plano
          </Link>
        </p>
      </div>
    </ShellGestor>
  );
}
