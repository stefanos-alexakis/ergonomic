import { carregarFormulario } from "@/lib/avaliacao-eixo2";
import { CONDICOES, ROTULO_CONDICAO, type Condicao } from "@/lib/eixo2";

/**
 * Relatório do Eixo 2 (modelo da cliente, nov/2026): perguntas e respostas por
 * setor, planos de ação, quadro consolidado por dimensão e dois textos gerados
 * pelo sistema — resumo executivo e observação interpretativa — que o consultor
 * pode editar no rascunho do relatório.
 */

export type RespostaQuestao = { setor: string; condicao: Condicao; justificativa: string | null; plano: string | null };

export type QuestaoRelatorio = { ordem: number; texto: string; respostas: RespostaQuestao[] };

export type DimensaoRelatorio = {
  nome: string;
  questoes: QuestaoRelatorio[];
  /** Quantas respostas (questão × setor) caíram em cada condição. */
  contagem: Record<Condicao, number>;
};

/** Plano de ação registrado, agrupado pelo texto: as mesmas propostas em vários setores viram uma frente. */
export type FrenteAcao = { dimensao: string; plano: string; setores: string[] };

export type RelatorioEixo2 = {
  nome: string;
  setores: string[];
  dimensoes: DimensaoRelatorio[];
  frentes: FrenteAcao[];
  totalRespostas: number;
  totalPlanos: number;
};

const vazio = (): Record<Condicao, number> => ({ EFICAZ: 0, PRECISA_MELHORAR: 0, INEXISTENTE: 0, NAO_SE_APLICA: 0 });

/** Monta o relatório a partir do formulário salvo (função pura sobre os dados já carregados). */
export function montarRelatorioEixo2(
  nome: string,
  setores: { id: string; nome: string }[],
  formulario: Awaited<ReturnType<typeof carregarFormulario>>,
): RelatorioEixo2 {
  const frentes = new Map<string, FrenteAcao>();
  let totalRespostas = 0;
  let totalPlanos = 0;
  const dimensoes: DimensaoRelatorio[] = formulario.dimensoes.map((d) => {
    const contagem = vazio();
    const questoes = d.questoes.map((q) => {
      const respostas: RespostaQuestao[] = [];
      for (const s of setores) {
        const r = formulario.respostas[`${q.id}:${s.id}`];
        if (!r) continue;
        totalRespostas++;
        contagem[r.condicao]++;
        respostas.push({ setor: s.nome, condicao: r.condicao, justificativa: r.justificativa, plano: r.planoAcao });
        if (r.planoAcao?.trim()) {
          totalPlanos++;
          const chave = `${d.nome}|${r.planoAcao.trim().toLocaleLowerCase("pt-BR")}`;
          const f = frentes.get(chave) ?? { dimensao: d.nome, plano: r.planoAcao.trim(), setores: [] };
          if (!f.setores.includes(s.nome)) f.setores.push(s.nome);
          frentes.set(chave, f);
        }
      }
      return { ordem: q.ordem, texto: q.texto, respostas };
    });
    return { nome: d.nome, questoes, contagem };
  });
  return { nome, setores: setores.map((s) => s.nome), dimensoes, frentes: [...frentes.values()], totalRespostas, totalPlanos };
}

const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);
const semNumero = (nome: string) => nome.replace(/^\d+\.\s*/, "");

/** Resumo executivo gerado pelo sistema (o consultor pode reescrever). */
export function resumoExecutivoEixo2(r: RelatorioEixo2): string {
  if (r.totalRespostas === 0) return "- Nenhuma resposta registrada na avaliação do Eixo 2.";
  const total = vazio();
  for (const d of r.dimensoes) for (const c of CONDICOES) total[c] += d.contagem[c];
  const predominante = [...CONDICOES].sort((a, b) => total[b] - total[a])[0]!;
  const pct = (n: number) => `${Math.round((n / r.totalRespostas) * 100)}%`;
  const inexistentes = r.dimensoes.filter((d) => d.contagem.INEXISTENTE > 0).map((d) => semNumero(d.nome));
  const todasPorSetor = r.frentes.filter((f) => f.setores.length === r.setores.length && r.setores.length > 1).length;
  const linhas = [
    `- Foram registradas ${r.totalRespostas} respostas (${r.setores.length} setor(es) avaliado(s)): ${pct(total.EFICAZ)} "existente e eficaz", ${pct(total.PRECISA_MELHORAR)} "existente, precisa melhorar", ${pct(total.INEXISTENTE)} "inexistente" e ${pct(total.NAO_SE_APLICA)} "não se aplica".`,
    `- A maior parte das evidências foi classificada como "${ROTULO_CONDICAO[predominante].toLocaleLowerCase("pt-BR")}".`,
    inexistentes.length
      ? `- Dimensões com alguma medida classificada como "inexistente", que demandam implantação estruturada de ação: ${lista(inexistentes)}.`
      : `- Nenhuma dimensão teve medida classificada como "inexistente".`,
    r.totalPlanos
      ? `- Foram registrados ${r.totalPlanos} planos de ação, consolidados em ${r.frentes.length} frente(s) de ação${todasPorSetor ? `, ${todasPorSetor} delas aplicável(is) a todos os setores avaliados` : ""}.`
      : "- Nenhum plano de ação foi registrado na avaliação.",
  ];
  return linhas.join("\n");
}

/** Observação interpretativa gerada pelo sistema (o consultor pode reescrever). */
export function observacaoEixo2(r: RelatorioEixo2): string {
  if (r.totalRespostas === 0) return "Sem respostas do Eixo 2 para interpretar.";
  const oportunidades = r.dimensoes
    .map((d) => ({ nome: semNumero(d.nome), n: d.contagem.PRECISA_MELHORAR + d.contagem.INEXISTENTE }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((d) => d.nome.toLocaleLowerCase("pt-BR"));
  const repetidas = r.frentes.filter((f) => f.setores.length > 1).length;
  const partes = [
    oportunidades.length
      ? `Os resultados do Eixo 02 demonstram predominância de oportunidades de aprimoramento em ${lista(oportunidades)}.`
      : "Os resultados do Eixo 02 indicam medidas de controle existentes e eficazes nas dimensões avaliadas.",
  ];
  if (repetidas > 0) {
    partes.push(
      "Como parte das propostas se repete entre os setores, recomenda-se implementação institucional centralizada, com desdobramento operacional por área.",
    );
  }
  return partes.join(" ");
}

/** Carrega e monta o relatório do Eixo 2 de uma avaliação (quem chama já validou a empresa). */
export async function carregarRelatorioEixo2(
  avaliacao: { id: string; nome: string },
  questionarioId: string,
  setores: { id: string; nome: string }[],
): Promise<RelatorioEixo2> {
  const formulario = await carregarFormulario(avaliacao.id, questionarioId);
  return montarRelatorioEixo2(avaliacao.nome, setores, formulario);
}
