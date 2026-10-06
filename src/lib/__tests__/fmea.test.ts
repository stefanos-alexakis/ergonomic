import { describe, expect, it } from "vitest";
import {
  calcularFmea,
  calcularPrazos,
  calcularPrioridade,
  calcularSeveridade,
  compararFmea,
  MATRIZ_S_O,
  notaDeteccao,
  notaOcorrencia,
} from "@/lib/fmea";

describe("notaOcorrencia — média do Eixo 1 em 5 faixas", () => {
  it("cortes 1,80 / 2,60 / 3,40 / 4,20 caem na faixa de baixo", () => {
    expect([1, 1.8, 1.81, 2.6, 2.61, 3.4, 3.41, 4.2, 4.21, 5].map(notaOcorrencia)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("valor calculado com resíduo de ponto flutuante não pula de faixa", () => {
    expect(notaOcorrencia(1.8000000001)).toBe(1);
  });
});

describe("notaDeteccao — fator do Eixo 2", () => {
  it("0,80 eficaz → 1; 0,90 precisa melhorar → 3; 1,00 inexistente → 5", () => {
    expect([0.8, 0.85, 0.86, 0.9, 0.93, 0.95, 0.96, 1].map(notaDeteccao)).toEqual([1, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("setor sem avaliação do Eixo 2 conta como sem controle (5)", () => {
    expect(notaDeteccao(null)).toBe(5);
  });
});

describe("calcularSeveridade — base + agravantes, teto 5", () => {
  const sem = { atestadoRelacionado: false, maiorAfastamentoDias: 0, parcelaExpostos: 0.2 };

  it("sem agravantes fica na base", () => {
    expect(calcularSeveridade({ base: 3, ...sem })).toEqual({ valor: 3, agravantes: [] });
  });

  it("atestado relacionado soma 1; afastamento acima de 15 dias soma outro", () => {
    expect(calcularSeveridade({ base: 2, ...sem, atestadoRelacionado: true, maiorAfastamentoDias: 15 }).valor).toBe(3);
    expect(calcularSeveridade({ base: 2, ...sem, atestadoRelacionado: true, maiorAfastamentoDias: 16 }).valor).toBe(4);
  });

  it("afastamento longo sem relação com o trabalho não conta", () => {
    expect(calcularSeveridade({ base: 2, ...sem, maiorAfastamentoDias: 60 }).valor).toBe(2);
  });

  it("50% ou mais de expostos soma 1; sem dado não soma", () => {
    expect(calcularSeveridade({ base: 3, ...sem, parcelaExpostos: 0.5 }).agravantes).toEqual(["EXPOSTOS"]);
    expect(calcularSeveridade({ base: 3, ...sem, parcelaExpostos: 0.49 }).agravantes).toEqual([]);
    expect(calcularSeveridade({ base: 3, ...sem, parcelaExpostos: null }).agravantes).toEqual([]);
  });

  it("nunca passa de 5", () => {
    const r = calcularSeveridade({ base: 4, atestadoRelacionado: true, maiorAfastamentoDias: 30, parcelaExpostos: 1 });
    expect(r.valor).toBe(5);
    expect(r.agravantes).toEqual(["ATESTADO", "AFASTAMENTO_LONGO", "EXPOSTOS"]);
  });
});

describe("calcularPrioridade — matriz S × O ajustada pela detecção", () => {
  it("D 2–3 mantém o nível da matriz em todas as 25 combinações", () => {
    for (let s = 1; s <= 5; s++)
      for (let o = 1; o <= 5; o++) {
        expect(calcularPrioridade(s, o, 2)).toBe(MATRIZ_S_O[s - 1]![o - 1]);
        expect(calcularPrioridade(s, o, 3)).toBe(MATRIZ_S_O[s - 1]![o - 1]);
      }
  });

  it("D 4–5 sobe um nível (Alta continua Alta)", () => {
    expect(calcularPrioridade(3, 1, 4)).toBe("MEDIA");
    expect(calcularPrioridade(3, 3, 5)).toBe("ALTA");
    expect(calcularPrioridade(5, 5, 5)).toBe("ALTA");
  });

  it("D 1 desce um nível, mas severidade 5 nunca fica abaixo de Média", () => {
    expect(calcularPrioridade(4, 5, 1)).toBe("MEDIA");
    expect(calcularPrioridade(3, 3, 1)).toBe("BAIXA");
    expect(calcularPrioridade(5, 1, 1)).toBe("MEDIA");
    expect(calcularPrioridade(5, 5, 1)).toBe("MEDIA");
  });
});

describe("calcularFmea — exemplos da proposta (setor Produção do teste)", () => {
  it("Horários e jornada: S 4+1+1→5, O 5, D 3 → Alta, RPN 75", () => {
    const r = calcularFmea({
      severidadeBase: 4,
      mediaEixo1: 5,
      fatorEixo2: 0.9,
      atestadoRelacionado: true,
      maiorAfastamentoDias: 5,
      parcelaExpostos: 1,
    });
    expect(r).toMatchObject({ s: 5, o: 5, d: 3, rpn: 75, prioridade: "ALTA" });
  });

  it("Equilíbrio trabalho-vida: S 5, O 5, D 1 → Média, RPN 25", () => {
    const r = calcularFmea({
      severidadeBase: 3,
      mediaEixo1: 5,
      fatorEixo2: 0.8,
      atestadoRelacionado: true,
      maiorAfastamentoDias: 5,
      parcelaExpostos: 1,
    });
    expect(r).toMatchObject({ s: 5, o: 5, d: 1, rpn: 25, prioridade: "MEDIA" });
  });

  it("Demandas: S 3+1→4, O 5, D 1 → Média, RPN 20", () => {
    const r = calcularFmea({
      severidadeBase: 3,
      mediaEixo1: 5,
      fatorEixo2: 0.8,
      atestadoRelacionado: false,
      maiorAfastamentoDias: 0,
      parcelaExpostos: 1,
    });
    expect(r).toMatchObject({ s: 4, o: 5, d: 1, rpn: 20, prioridade: "MEDIA" });
  });

  it("ordena Alta antes de Média e, empatado, maior RPN primeiro", () => {
    const alta = { s: 5, sBase: 5, agravantes: [], o: 5, d: 3, rpn: 75, prioridade: "ALTA" as const };
    const media20 = { ...alta, rpn: 20, prioridade: "MEDIA" as const };
    const media25 = { ...alta, rpn: 25, prioridade: "MEDIA" as const };
    expect([media20, alta, media25].sort(compararFmea)).toEqual([alta, media25, media20]);
  });
});

describe("calcularPrazos — contados da emissão do relatório", () => {
  const emissao = new Date("2026-10-06T12:00:00Z");

  it("Alta: plano em 30 dias, medidas em 90, reavaliar em 6 meses", () => {
    const p = calcularPrazos("ALTA", emissao);
    expect(p.plano?.toISOString().slice(0, 10)).toBe("2026-11-05");
    expect(p.implantacao?.toISOString().slice(0, 10)).toBe("2027-01-04");
    expect(p.reavaliacao.toISOString().slice(0, 10)).toBe("2027-04-06");
  });

  it("Baixa: só reavaliação, em 24 meses", () => {
    const p = calcularPrazos("BAIXA", emissao);
    expect(p.plano).toBeNull();
    expect(p.implantacao).toBeNull();
    expect(p.reavaliacao.toISOString().slice(0, 10)).toBe("2028-10-06");
  });
});
