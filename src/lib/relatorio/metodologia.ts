import { VALOR_CONDICAO, ROTULO_CONDICAO, CONDICOES } from "@/lib/eixo2";
import { FATOR_AGRAVAMENTO } from "@/lib/eixo3";
import {
  DIAS_AFASTAMENTO_LONGO,
  FAIXAS_D,
  FAIXAS_O,
  MATRIZ_S_O,
  MEDIA_EXPOSTO,
  PARCELA_EXPOSTOS,
  PRIORIDADES,
  textoRegraPrazo,
  type RegrasPrazo,
} from "@/lib/fmea";
import { CONCLUSOES } from "@/lib/score-final";

/**
 * Metodologia de pontuação — FONTE ÚNICA do texto (aprovado pelo cliente
 * em out/2026). Usada no relatório completo (PDF) e para gerar
 * docs/metodologia-final.md (scripts/gerar-metodologia.ts). Os números
 * variáveis (mínimo de respostas, prazos, severidades, situações do PGR)
 * entram pelos parâmetros, com os valores vigentes no sistema.
 */

export type Bloco =
  | { tipo: "p"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "formula"; texto: string }
  | { tipo: "tabela"; colunas: string[]; linhas: string[][] };

export type SecaoTexto = { titulo: string; blocos: Bloco[] };

export type ParametrosMetodologia = {
  limiteAnonimato: number;
  regrasPrazo: RegrasPrazo;
  severidades: { fator: string; severidade: number | null }[];
  situacoesPgr: { numero: number; texto: string; fator: string }[];
};

const v2 = (x: number) => x.toFixed(2).replace(".", ",");
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function secoesMetodologia(p: ParametrosMetodologia): SecaoTexto[] {
  const agravo = Math.round((FATOR_AGRAVAMENTO - 1) * 100);
  return [
    {
      titulo: "Visão geral",
      blocos: [
        {
          tipo: "p",
          texto:
            "A avaliação dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT) cruza três fontes independentes de informação, por setor e por fator (13 fatores, 35 situações investigadas), atendendo ao gerenciamento de riscos ocupacionais da NR-1 e ao Programa de Gerenciamento de Riscos (PGR).",
        },
        {
          tipo: "tabela",
          colunas: ["Eixo", "Quem informa", "O que mede", "Papel no índice"],
          linhas: [
            ["1 · Percepção", "Colaboradores, de forma anônima", "Como o trabalho é percebido", "Base de 1 a 5"],
            ["2 · Medidas de controle", "Empresa (gestor/consultoria)", "O que a empresa já faz", "Reduz até 20% (×0,80 a ×1,00)"],
            ["3 · Atestados CID-F", "RH/DP da empresa", "O que já aconteceu", `Agrava ${agravo}% (×${v2(FATOR_AGRAVAMENTO)}) com caso ligado ao trabalho`],
          ],
        },
      ],
    },
    {
      titulo: "Eixo 1 — Percepção dos colaboradores",
      blocos: [
        {
          tipo: "p",
          texto:
            "Cada colaborador responde 35 perguntas na escala Nunca (1), Raramente (2), Às vezes (3), Frequentemente (4) e Sempre (5), pensando nos últimos 6 meses. Quanto maior o valor, maior a exposição. Cada pergunta tem um peso (padrão 1), ajustável pelo administrador da plataforma.",
        },
        {
          tipo: "lista",
          itens: [
            "Índice do fator no setor: média ponderada de todas as respostas dos colaboradores do setor às perguntas daquele fator.",
            `Respondente exposto: resposta (ou média individual no fator) igual ou maior que ${MEDIA_EXPOSTO} — Frequentemente ou Sempre.`,
            "Só entram respostas concluídas; códigos de teste nunca entram nos indicadores.",
          ],
        },
      ],
    },
    {
      titulo: "Eixo 2 — Medidas de controle",
      blocos: [
        {
          tipo: "p",
          texto:
            "Para cada situação investigada, a empresa informa, por setor, a condição da medida de controle. O fator do Eixo 2 é a média ponderada das condições das questões do fator (setor fora da avaliação entra como ×1,00).",
        },
        {
          tipo: "tabela",
          colunas: ["Condição", "Fator"],
          linhas: CONDICOES.map((c) => [ROTULO_CONDICAO[c], `×${v2(VALOR_CONDICAO[c])}`]),
        },
      ],
    },
    {
      titulo: "Eixo 3 — Atestados e afastamentos CID-F",
      blocos: [
        {
          tipo: "p",
          texto: `O RH/DP publica as ocorrências CID-F do período, sem identificar o trabalhador, com a relação com o trabalho (Sim, Não ou Inconclusivo). Se houve no setor ao menos uma ocorrência com relação "Sim" e CID compatível com o fator (matriz Fatores × CID F), o fator recebe ×${v2(FATOR_AGRAVAMENTO)}; senão, ×1,00. A quantidade de ocorrências não gradua o agravamento.`,
        },
        {
          tipo: "lista",
          itens: [
            "Subcódigos citados explicitamente na matriz (ex.: F43.1) só casam com os fatores que os citam; os demais casam pela categoria (F41.1 → F41).",
            "CID sem correspondência na matriz não agrava nenhum fator; ocorrência Inconclusiva não agrava, mas é sinalizada para investigação.",
            "O CID não comprova nexo causal isoladamente: o Eixo 3 é indicador agravante coletivo, não prova individual.",
          ],
        },
      ],
    },
    {
      titulo: "Índice final e faixas",
      blocos: [
        { tipo: "formula", texto: "Índice final = Eixo 1 × Fator do Eixo 2 × Fator do Eixo 3   (escala 1 a 5; quanto maior, pior)" },
        {
          tipo: "tabela",
          colunas: ["Índice final", "Faixa", "Conclusão", "Encaminhamento"],
          linhas: [
            ["até 3,00", CONCLUSOES.SEM_RISCO.curto, CONCLUSOES.SEM_RISCO.rotulo, CONCLUSOES.SEM_RISCO.encaminhamento],
            ["3,01 a 4,00", CONCLUSOES.CONTROLE.curto, CONCLUSOES.CONTROLE.rotulo, CONCLUSOES.CONTROLE.encaminhamento],
            ["acima de 4,00", CONCLUSOES.RISCO_EXISTENTE.curto, CONCLUSOES.RISCO_EXISTENTE.rotulo, CONCLUSOES.RISCO_EXISTENTE.encaminhamento],
          ],
        },
        {
          tipo: "lista",
          itens: [
            "Comparação em centésimos: 3,00 calculado nunca passa para a faixa seguinte.",
            "Índice do setor = média dos fatores com dado; resultado geral da empresa = média dos setores com índice.",
            "Terminologia: antes da matriz FMEA fala-se em índice; depois da classificação FMEA e no PGR, em risco.",
          ],
        },
      ],
    },
    {
      titulo: "O que vai para o PGR",
      blocos: [
        {
          tipo: "p",
          texto:
            "O PGR recebe somente as situações inerentes à função, cada uma com índice próprio por setor (Eixo 1 da pergunta × Eixo 2 da questão × Eixo 3 da situação). A situação entra no PGR quando esse índice passa de 3,00. Os demais fatores, mesmo acima de 4,00, vão para o plano de ação, fora do PGR.",
        },
        {
          tipo: "tabela",
          colunas: ["Nº", "Situação", "Fator"],
          linhas: p.situacoesPgr.map((s) => [String(s.numero), s.texto, s.fator]),
        },
      ],
    },
    {
      titulo: "Matriz FMEA — classificação dos riscos e prioridade",
      blocos: [
        {
          tipo: "p",
          texto:
            "Todo item acima de 3,00 (situações do PGR e fatores do plano de ação) é classificado por Severidade (S) × Ocorrência (O) × Detecção (D), cada um de 1 a 5.",
        },
        {
          tipo: "lista",
          itens: [
            `S · Severidade: severidade-base do fator (tabela abaixo) + 1 para cada agravante no setor, até 5 — atestado relacionado ao trabalho; afastamento acima de ${DIAS_AFASTAMENTO_LONGO} dias; ${pct(PARCELA_EXPOSTOS)} ou mais dos respondentes expostos.`,
            `O · Ocorrência (média do Eixo 1): ${FAIXAS_O.map((f, i) => `${f} → ${i + 1}`).join(" · ")}.`,
            `D · Detecção (fator do Eixo 2): ${FAIXAS_D.map((f, i) => `${f} → ${i + 1}`).join(" · ")}.`,
            "Prioridade: matriz S × O; detecção 4–5 sobe um nível e detecção 1 desce um (severidade 5 nunca abaixo de Média). RPN = S × O × D desempata.",
          ],
        },
        {
          tipo: "tabela",
          colunas: ["S \\ O", "1", "2", "3", "4", "5"],
          linhas: MATRIZ_S_O.map((linha, i) => [`S${i + 1}`, ...linha.map((x) => PRIORIDADES[x].rotulo)]).reverse(),
        },
        {
          tipo: "tabela",
          colunas: ["Fator", "Severidade-base"],
          linhas: p.severidades.map((s) => [s.fator, s.severidade !== null ? String(s.severidade) : "não cadastrada (usa 3)"]),
        },
        {
          tipo: "tabela",
          colunas: ["Prioridade", "Prazos (contados da emissão)"],
          linhas: (["ALTA", "MEDIA", "BAIXA"] as const).map((k) => [PRIORIDADES[k].rotulo, textoRegraPrazo(p.regrasPrazo[k])]),
        },
      ],
    },
    {
      titulo: "Anonimato e proteção de dados (LGPD)",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "O colaborador acessa a pesquisa por um código impresso, sem login, nome ou e-mail; o código é retirado do endereço da página assim que é lido.",
            `Setor, departamento ou filtro com menos de ${p.limiteAnonimato} respostas não tem resultado exibido ("amostra insuficiente") e fica fora do índice, da FMEA e do PGR.`,
            "Quando um único grupo é escondido, o segundo menor também é, para impedir a dedução por subtração.",
            "O horário individual de resposta nunca é exibido nem exportado.",
            "O Eixo 3 não aceita identificação do trabalhador; os relatórios mostram apenas indicadores agregados por setor.",
            "A pré-pesquisa de perfil (quando aplicada) usa faixas para idade, peso e altura; a empresa vê apenas os totais, separados do questionário.",
          ],
        },
      ],
    },
  ];
}

/** Markdown da metodologia (docs/metodologia-final.md). */
export function metodologiaEmMarkdown(p: ParametrosMetodologia): string {
  const linhas: string[] = ["# Metodologia de pontuação — FRPRT", ""];
  for (const s of secoesMetodologia(p)) {
    linhas.push(`## ${s.titulo}`, "");
    for (const b of s.blocos) {
      if (b.tipo === "p") linhas.push(b.texto, "");
      else if (b.tipo === "formula") linhas.push("```", b.texto, "```", "");
      else if (b.tipo === "lista") linhas.push(...b.itens.map((i) => `- ${i}`), "");
      else {
        linhas.push(`| ${b.colunas.join(" | ")} |`, `|${b.colunas.map(() => "---").join("|")}|`);
        for (const l of b.linhas) linhas.push(`| ${l.join(" | ")} |`);
        linhas.push("");
      }
    }
  }
  return linhas.join("\n");
}
