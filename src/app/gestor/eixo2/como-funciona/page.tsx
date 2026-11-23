import Link from "next/link";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { VALOR_CONDICAO, ROTULO_CONDICAO, formatarFator, type Condicao } from "@/lib/eixo2";
import { contextoGestor } from "../contexto";

export const dynamic = "force-dynamic";

const EFEITO: Record<Condicao, string> = {
  EFICAZ: "Atenuação máxima: a medida existe e funciona.",
  PRECISA_MELHORAR: "Atenuação parcial: a medida existe, mas precisa melhorar.",
  INEXISTENTE: "Nenhuma atenuação: não há medida para o risco.",
  NAO_SE_APLICA: "O setor não está exposto à situação, então não há falta de controle. Vale o mesmo que “eficaz”.",
};
const ORDEM: Condicao[] = ["EFICAZ", "PRECISA_MELHORAR", "INEXISTENTE", "NAO_SE_APLICA"];

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-zinc-900">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

/**
 * Explicação do score do Eixo 2. Texto único, igual para todas as empresas;
 * os valores da tabela vêm da própria regra de cálculo (src/lib/eixo2.ts).
 */
export default async function ComoFuncionaEixo2Page() {
  const { actor, workspace } = await contextoGestor();

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader eyebrow="Eixo 2 · Medidas de controle" title="Como funciona o score do Eixo 2" />

      <div className="flex max-w-3xl flex-col gap-8">
        <Secao titulo="O que é o Eixo 2">
          <p>
            O Eixo 2 registra as <strong>medidas de controle</strong> que a empresa já adota para os fatores de risco
            psicossocial que os colaboradores avaliam no Eixo 1. Quem informa é a própria empresa (liderança, RH ou
            grupo focal), em entrevista com a consultoria.
          </p>
          <p>
            A avaliação é feita <strong>por setor</strong>: cada setor tem o seu resultado, porque uma medida pode existir
            em um setor e não existir em outro.
          </p>
        </Secao>

        <Secao titulo="O valor de cada medida">
          <p>Para cada situação investigada, o setor recebe uma das quatro respostas abaixo:</p>
          <Table>
            <Thead>
              <Tr>
                <Th>Resposta</Th>
                <Th>Valor</Th>
                <Th>O que significa</Th>
              </Tr>
            </Thead>
            <tbody>
              {ORDEM.map((c) => (
                <Tr key={c}>
                  <Td className="font-medium text-zinc-900">{ROTULO_CONDICAO[c]}</Td>
                  <Td className="tabular-nums">{formatarFator(VALOR_CONDICAO[c])}</Td>
                  <Td>{EFEITO[c]}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Secao>

        <Secao titulo="Do valor das medidas ao fator do setor">
          <p>
            O <strong>fator do Eixo 2</strong> de um setor, em cada fator de risco, é a média dos valores das medidas
            daquele fator (ponderada pelos pesos definidos pela plataforma). Por isso ele fica entre{" "}
            <strong>×0,80</strong> (todas as medidas existem e são eficazes) e <strong>×1,00</strong> (nenhuma medida).
          </p>
        </Secao>

        <Secao titulo="Como o multiplicador atenua o risco">
          <p>
            No score final, o fator do Eixo 2 multiplica o resultado do Eixo 1:{" "}
            <strong>Eixo 1 × Fator do Eixo 2 × Fator do Eixo 3</strong>. Quando as medidas implantadas funcionam, o fator
            fica <strong>abaixo de 1,00</strong> e reduz o resultado, em até 20%: as ações implantadas{" "}
            <strong>atenuam</strong> o risco.
          </p>
          <p>
            Quando <strong>não há medida</strong>, o fator é <strong>1,00</strong>: o resultado do Eixo 1 continua igual,
            sem atenuante. O mesmo vale para um setor que ainda não foi avaliado no Eixo 2.
          </p>
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
            <strong>Exemplo.</strong> O Eixo 1 de um fator deu 4,00. Com medidas que levam o fator do Eixo 2 a ×0,85, o
            resultado passa a 3,40. Sem nenhuma medida (×1,00), continua 4,00.
          </p>
          <p>O fator também define a nota de detecção (D) da matriz FMEA: quanto menos controle, maior a nota.</p>
        </Secao>

        <Secao titulo="O que é o índice de controle (%)">
          <p>
            É o mesmo fator, escrito em porcentagem para facilitar a leitura: <strong>×0,80 = 100%</strong> (todas as
            medidas existem e são eficazes) e <strong>×1,00 = 0%</strong> (nenhuma medida). Por exemplo, um fator ×0,82
            aparece como cerca de 90%; o número exato depende do fator sem arredondar, por isso pode aparecer 89%.
          </p>
          <p>
            Não é a porcentagem de medidas implantadas: é o quanto o fator se aproxima do melhor resultado possível.
          </p>
        </Secao>

        <Secao titulo="Bom, Regular e Ruim">
          <p className="flex flex-wrap items-center gap-2">
            <Badge tom="sucesso">Bom</Badge> até ×0,85 · <Badge tom="atencao">Regular</Badge> até ×0,95 ·{" "}
            <Badge tom="perigo">Ruim</Badge> acima disso.
          </p>
          <p>
            A classificação diz o quanto as medidas atenuam o risco. “Ruim” significa pouca ou nenhuma atenuação, não
            que o risco do setor seja alto: isso é medido pelo Eixo 1.
          </p>
        </Secao>

        <p>
          <Link href="/gestor/relatorios-eixo2" className="text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900">
            ← Voltar aos relatórios do Eixo 2
          </Link>
        </p>
      </div>
    </ShellGestor>
  );
}
