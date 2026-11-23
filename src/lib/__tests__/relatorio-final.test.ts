import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { montarRelatorioEixo2, observacaoEixo2, resumoExecutivoEixo2 } from "@/lib/relatorio/eixo2-relatorio";
import { lerTextosFinal } from "@/lib/relatorio/relatorio-final";
import { ehFavoravel, positividade, type FatorDistribuicao } from "@/lib/distribuicao-respostas";
import { FATOR_FORA_DA_FMEA, foraDaFmea } from "@/lib/fmea";
import type { Condicao } from "@/lib/eixo2";

const setores = [
  { id: "s1", nome: "Administrativo" },
  { id: "s2", nome: "Logística" },
];

function formulario(respostas: Record<string, { condicao: Condicao; planoAcao?: string | null; justificativa?: string | null }>) {
  const r: Record<string, { condicao: Condicao; planoAcao: string | null; justificativa: string | null }> = {};
  for (const [k, v] of Object.entries(respostas)) r[k] = { condicao: v.condicao, planoAcao: v.planoAcao ?? null, justificativa: v.justificativa ?? null };
  return {
    dimensoes: [
      {
        id: "d1",
        nome: "1. Instrução de Trabalho",
        fator: "f",
        questoes: [{ id: "q1", ordem: 1, texto: "Há descrição de cargo?", planoSugerido: null, perguntaColaborador: "", peso: 1, perguntaEixo1Id: "p1" }],
      },
      {
        id: "d9",
        nome: "9. Liderança",
        fator: "f",
        questoes: [{ id: "q2", ordem: 2, texto: "Há treinamento de líderes?", planoSugerido: null, perguntaColaborador: "", peso: 1, perguntaEixo1Id: "p2" }],
      },
    ],
    respostas: r,
  };
}

describe("relatório do Eixo 2", () => {
  const rel = montarRelatorioEixo2(
    "Avaliação Nov",
    setores,
    formulario({
      "q1:s1": { condicao: "EFICAZ" },
      "q1:s2": { condicao: "PRECISA_MELHORAR", planoAcao: "Atualizar a integração" },
      "q2:s1": { condicao: "INEXISTENTE", planoAcao: "Capacitar líderes" },
      "q2:s2": { condicao: "INEXISTENTE", planoAcao: "capacitar líderes " },
    }),
  );

  it("conta respostas por condição e consolida planos iguais em uma frente", () => {
    expect(rel.totalRespostas).toBe(4);
    expect(rel.totalPlanos).toBe(3);
    expect(rel.dimensoes[1]!.contagem).toMatchObject({ INEXISTENTE: 2, EFICAZ: 0 });
    // "Capacitar líderes" nos dois setores vira uma frente só (sem diferença de caixa/espaço).
    expect(rel.frentes).toHaveLength(2);
    expect(rel.frentes.find((f) => f.dimensao === "9. Liderança")!.setores).toEqual(["Administrativo", "Logística"]);
  });

  it("resumo executivo gerado: percentuais, predominante, dimensões inexistentes e frentes", () => {
    const t = resumoExecutivoEixo2(rel);
    expect(t).toContain("Foram registradas 4 respostas (2 setor(es) avaliado(s))");
    expect(t).toContain('25% "existente e eficaz"');
    expect(t).toContain('50% "inexistente"');
    expect(t).toContain('classificada como "inexistente"');
    expect(t).toContain("Dimensões com alguma medida classificada como \"inexistente\", que demandam implantação estruturada de ação: Liderança.");
    expect(t).toContain("3 planos de ação, consolidados em 2 frente(s) de ação, 1 delas aplicável(is) a todos os setores avaliados");
    expect(t.split("\n").every((l) => l.startsWith("- "))).toBe(true);
  });

  it("observação interpretativa gerada cita as dimensões com oportunidades e a implantação centralizada", () => {
    const t = observacaoEixo2(rel);
    expect(t).toContain("oportunidades de aprimoramento em liderança e instrução de trabalho");
    expect(t).toContain("implementação institucional centralizada");
  });

  it("sem respostas: textos neutros", () => {
    const vazio = montarRelatorioEixo2("X", setores, formulario({}));
    expect(resumoExecutivoEixo2(vazio)).toMatch(/Nenhuma resposta/);
    expect(observacaoEixo2(vazio)).toMatch(/Sem respostas/);
  });
});

describe("percentual de positividade (Eixo 1)", () => {
  it("favorável = 1 ou 2 na escala de risco (inverte as perguntas positivas)", () => {
    expect(ehFavoravel(1, "MAIOR_PIOR")).toBe(true);
    expect(ehFavoravel(2, "MAIOR_PIOR")).toBe(true);
    expect(ehFavoravel(3, "MAIOR_PIOR")).toBe(false);
    expect(ehFavoravel(5, "MAIOR_MELHOR")).toBe(true);
    expect(ehFavoravel(1, "MAIOR_MELHOR")).toBe(false);
  });

  it("respostas favoráveis ÷ respostas do fator", () => {
    const pergunta = (polaridade: "MAIOR_PIOR" | "MAIOR_MELHOR") => ({
      id: "p",
      numero: 1,
      texto: "",
      polaridade,
      peso: 1,
      fatorId: "f",
      fatorNome: "1. X",
    });
    const fator: FatorDistribuicao = {
      id: "f",
      nome: "1. X",
      indice: null,
      linhas: [
        { pergunta: pergunta("MAIOR_PIOR"), contagem: { 1: 3, 2: 1, 3: 2, 4: 1, 5: 1 }, n: 8, expostos: 2, parcelaExpostos: 0.25, destaque: false },
        { pergunta: pergunta("MAIOR_MELHOR"), contagem: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 1 }, n: 2, expostos: 1, parcelaExpostos: 0.5, destaque: true },
      ],
    };
    // Favoráveis: 3 + 1 (1ª pergunta) + 1 "Sempre" na positiva = 5 de 10.
    expect(positividade(fator)).toBe(0.5);
    expect(positividade({ ...fator, linhas: [] })).toBeNull();
  });
});

describe("Lei 14.457: fator 11 fora da FMEA", () => {
  it("identifica o fator pelo número do nome da dimensão", () => {
    expect(FATOR_FORA_DA_FMEA).toBe(11);
    expect(foraDaFmea("11. Violência no Trabalho")).toBe(true);
    expect(foraDaFmea("1. Instrução de Trabalho")).toBe(false);
    expect(foraDaFmea("12. Tarefas com Exposição a Situações Extremas")).toBe(false);
  });
});

describe("textos editáveis do relatório final", () => {
  const padroes = { resumoEixo2: "- Resumo do sistema", observacaoEixo2: "Observação do sistema", fontesInternas: "- Fonte" };
  const fd = (c: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(c)) f.set(k, v);
    return f;
  };

  it("texto igual ao gerado (ou vazio) fica nulo, para continuar acompanhando os dados", () => {
    const r = lerTextosFinal(fd({ resumoEixo2: "- Resumo do sistema", observacaoEixo2: "", fontesInternas: "- Fonte", cruzamentoAnalitico: "" }), padroes);
    expect(r).toEqual({ ok: true, textos: { cruzamentoAnalitico: null, resumoEixo2: null, observacaoEixo2: null, fontesInternas: null } });
  });

  it("texto editado é guardado", () => {
    const r = lerTextosFinal(fd({ resumoEixo2: "- Meu resumo", cruzamentoAnalitico: "Na Manipulação, a percepção..." }), padroes);
    expect(r.ok && r.textos).toMatchObject({ resumoEixo2: "- Meu resumo", cruzamentoAnalitico: "Na Manipulação, a percepção..." });
  });

  it("recusa texto longo demais", () => {
    expect(lerTextosFinal(fd({ cruzamentoAnalitico: "x".repeat(30_001) }), padroes).ok).toBe(false);
  });
});
