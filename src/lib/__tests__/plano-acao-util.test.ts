import { describe, expect, it } from "vitest";
import {
  agruparPlanosEixo2,
  dataIso,
  formatarDia,
  formatarReais,
  hojeIso,
  lerData,
  lerReais,
  reaisParaCampo,
  seguroParaPlanilha,
  situacaoDaAcao,
} from "@/lib/plano-acao-util";

describe("lerReais — formato brasileiro em centavos", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,5", 123450],
    ["R$ 1.500", 150000],
    ["1.500.000", 150000000],
    ["1234.56", 123456],
    ["0,10", 10],
    ["0", 0],
  ])("%s → %d centavos", (texto, centavos) => {
    expect(lerReais(texto)).toEqual({ ok: true, centavos });
  });

  it("vazio é sem custo", () => {
    expect(lerReais("  ")).toEqual({ ok: true, centavos: null });
  });

  it("recusa texto, negativo e valor absurdo", () => {
    for (const t of ["abc", "-10", "1,2,3", "999999999999"]) expect(lerReais(t).ok).toBe(false);
  });

  it("ida e volta pelo campo do formulário", () => {
    expect(reaisParaCampo(123456)).toBe("1234,56");
    expect(lerReais(reaisParaCampo(123456))).toEqual({ ok: true, centavos: 123456 });
    expect(formatarReais(123456)).toMatch(/1\.234,56/);
  });
});

describe("datas sem hora", () => {
  it("lê aaaa-mm-dd e recusa data inexistente", () => {
    expect(dataIso(lerData("2026-10-06"))).toBe("2026-10-06");
    expect(lerData("")).toBeNull();
    expect(lerData("2026-02-30")).toBeUndefined();
    expect(lerData("06/10/2026")).toBeUndefined();
  });

  it("formata o dia sem deslocar pelo fuso", () => {
    expect(formatarDia(lerData("2026-01-01"))).toBe("01/01/2026");
  });

  it("hoje é calculado em São Paulo (23h30 de SP ainda é o mesmo dia)", () => {
    expect(hojeIso(new Date("2026-10-07T02:30:00Z"))).toBe("2026-10-06");
  });
});

describe("situacaoDaAcao — atraso só com a ação aberta", () => {
  const hoje = "2026-10-06";
  const d = (s: string) => lerData(s)!;

  it("prazo vencido em execução é atrasada; no próprio dia, não", () => {
    expect(situacaoDaAcao({ fase: "EXECUTAR", prazo: d("2026-10-05"), reavaliarEm: null }, hoje)).toBe("ATRASADA");
    expect(situacaoDaAcao({ fase: "EXECUTAR", prazo: d("2026-10-06"), reavaliarEm: null }, hoje)).toBe("VENCE_EM_BREVE");
  });

  it("concluída ou cancelada nunca fica atrasada", () => {
    expect(situacaoDaAcao({ fase: "CONCLUIDA", prazo: d("2020-01-01"), reavaliarEm: null }, hoje)).toBe("CONCLUIDA");
    expect(situacaoDaAcao({ fase: "CANCELADA", prazo: d("2020-01-01"), reavaliarEm: null }, hoje)).toBe("CANCELADA");
  });

  it("em verificação vale a data de reavaliação", () => {
    expect(
      situacaoDaAcao({ fase: "VERIFICAR", prazo: d("2026-01-01"), reavaliarEm: d("2027-04-06") }, hoje),
    ).toBe("NO_PRAZO");
  });

  it("vence em até 30 dias e sem prazo", () => {
    expect(situacaoDaAcao({ fase: "PLANEJAR", prazo: d("2026-11-05"), reavaliarEm: null }, hoje)).toBe("VENCE_EM_BREVE");
    expect(situacaoDaAcao({ fase: "PLANEJAR", prazo: d("2026-11-06"), reavaliarEm: null }, hoje)).toBe("NO_PRAZO");
    expect(situacaoDaAcao({ fase: "PLANEJAR", prazo: null, reavaliarEm: null }, hoje)).toBe("SEM_PRAZO");
  });
});

describe("agruparPlanosEixo2 — 'responder para todos' vira uma ação com vários setores", () => {
  it("mesma questão e mesmo texto (ignorando espaços e maiúsculas) agrupam", () => {
    const g = agruparPlanosEixo2([
      { questaoId: "q1", setorId: "s1", planoAcao: "Limitar horas extras" },
      { questaoId: "q1", setorId: "s2", planoAcao: "  limitar   horas EXTRAS " },
      { questaoId: "q1", setorId: "s3", planoAcao: "Outra ação" },
      { questaoId: "q2", setorId: "s1", planoAcao: "Limitar horas extras" },
      { questaoId: "q1", setorId: "s4", planoAcao: "   " },
    ]);
    expect(g).toHaveLength(3);
    expect(g[0]).toMatchObject({ questaoId: "q1", texto: "Limitar horas extras", setores: ["s1", "s2"] });
  });
});

describe("seguroParaPlanilha — evita fórmula ao abrir no Excel", () => {
  it("prefixa o que começa com = + - @", () => {
    expect(seguroParaPlanilha("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(seguroParaPlanilha("-10")).toBe("'-10");
    expect(seguroParaPlanilha("Treinar líderes")).toBe("Treinar líderes");
  });
});
