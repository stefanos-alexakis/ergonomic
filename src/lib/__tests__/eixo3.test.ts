import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calcularEixo3Setor,
  chaveColaborador,
  fatoresCompativeis,
  montarMatrizPorFator,
  normalizarCid,
  normalizarMatricula,
  normalizarRelacao,
} from "@/lib/eixo3";

/** Matriz real (aba 2 da planilha da cliente), agrupada pela dimensão do v2. */
const matrizJson = JSON.parse(
  readFileSync(join(process.cwd(), "prisma", "seed-data", "matriz-cid-v2.json"), "utf-8"),
) as { ordem: number; cids: string[]; naoEspecifico: boolean; situacao: string }[];
const v2 = JSON.parse(readFileSync(join(process.cwd(), "prisma", "seed-data", "perguntas-v2.json"), "utf-8")) as {
  ordemGlobal: number;
  dimensao: string;
  situacaoInvestigada: string;
}[];
const matriz = montarMatrizPorFator(
  matrizJson.map((m) => ({
    fatorId: v2.find((p) => p.ordemGlobal === m.ordem)!.dimensao,
    cids: m.cids,
    naoEspecifico: m.naoEspecifico,
  })),
);

describe("matriz-cid-v2.json", () => {
  it("tem as 35 situações do v2, na mesma ordem", () => {
    expect(matrizJson.map((m) => m.ordem)).toEqual(v2.map((p) => p.ordemGlobal));
  });
  it("só a situação de acidente grave é 'Não específico'", () => {
    expect(matrizJson.filter((m) => m.naoEspecifico).map((m) => m.ordem)).toEqual([33]);
  });
});

describe("normalizarCid", () => {
  it("aceita as formas comuns e normaliza", () => {
    expect(normalizarCid("F41.1")).toBe("F41.1");
    expect(normalizarCid("f411")).toBe("F41.1");
    expect(normalizarCid(" F 41.1 ")).toBe("F41.1");
    expect(normalizarCid("F32")).toBe("F32");
    expect(normalizarCid("F43.1 - Transtorno de estresse pós-traumático")).toBe("F43.1");
  });
  it("recusa CID fora do capítulo F ou mal formado", () => {
    expect(normalizarCid("M54.5")).toBeNull();
    expect(normalizarCid("F4")).toBeNull();
    expect(normalizarCid("F4112")).toBeNull();
    expect(normalizarCid("")).toBeNull();
    expect(normalizarCid(null)).toBeNull();
  });
});

describe("normalizarRelacao", () => {
  it("aceita variações de caixa e acento", () => {
    expect(normalizarRelacao("Sim")).toBe("SIM");
    expect(normalizarRelacao("NÃO")).toBe("NAO");
    expect(normalizarRelacao("nao")).toBe("NAO");
    expect(normalizarRelacao(" Inconclusivo ")).toBe("INCONCLUSIVO");
    expect(normalizarRelacao("talvez")).toBeNull();
  });
});

describe("fatoresCompativeis — regras da aba 3", () => {
  it("F43.1 agrava SÓ Violência e Situações Extremas (não é sinônimo de estresse ocupacional)", () => {
    expect(fatoresCompativeis("F43.1", matriz).sort()).toEqual([
      "11. Violência no Trabalho",
      "12. Tarefas com Exposição a Situações Extremas",
    ]);
  });

  it("F41.1 casa pela categoria F41 — presente nos 13 fatores", () => {
    expect(fatoresCompativeis("F41.1", matriz)).toHaveLength(13);
  });

  it("F43.2 (adaptação) casa pela categoria F43 — os 13 fatores", () => {
    expect(fatoresCompativeis("F43.2", matriz)).toHaveLength(13);
  });

  it("F51.2 só em Horários e Equilíbrio Trabalho-Vida", () => {
    expect(fatoresCompativeis("F51.2", matriz).sort()).toEqual([
      "10. Equilíbrio Trabalho-Vida",
      "5. Horários e Jornada",
    ]);
  });

  it("F48.0 só em Demandas, Ritmo e Horários; F48.8 só em Liderança", () => {
    expect(fatoresCompativeis("F48.0", matriz).sort()).toEqual([
      "2. Demandas de Trabalho",
      "4. Ritmo e Cadência",
      "5. Horários e Jornada",
    ]);
    expect(fatoresCompativeis("F48.8", matriz)).toEqual(["9. Liderança"]);
  });

  it("CID sem correspondência na matriz não agrava nada (\"não forçar um CID F\")", () => {
    expect(fatoresCompativeis("F20", matriz)).toEqual([]);
    expect(fatoresCompativeis("F51.0", matriz)).toEqual([]);
    expect(fatoresCompativeis("F48.1", matriz)).toEqual([]);
  });

  it("F32 não casa com Instrução, Controle, Ritmo, Horários nem Mudanças", () => {
    const comF32 = fatoresCompativeis("F32.1", matriz);
    for (const fora of [
      "1. Instrução de Trabalho",
      "3. Controle e Autonomia",
      "4. Ritmo e Cadência",
      "5. Horários e Jornada",
      "7. Gestão de Mudanças",
    ]) {
      expect(comF32).not.toContain(fora);
    }
  });
});

describe("calcularEixo3Setor", () => {
  it("só 'Sim' agrava; ×1,10 fixo, independente de quantas ocorrências", () => {
    const r = calcularEixo3Setor(
      [
        { cid: "F51.2", relacao: "SIM", diasAfastados: 5 },
        { cid: "F51.2", relacao: "SIM", diasAfastados: 3 },
        { cid: "F43.1", relacao: "NAO", diasAfastados: 10 },
        { cid: "F32", relacao: "INCONCLUSIVO", diasAfastados: null },
      ],
      matriz,
    );
    expect(r.fatorPorFator.get("5. Horários e Jornada")).toBe(1.1);
    expect(r.fatorPorFator.get("10. Equilíbrio Trabalho-Vida")).toBe(1.1);
    expect(r.fatorPorFator.get("11. Violência no Trabalho")).toBe(1); // F43.1 era "Não"
    expect(r.fatorPorFator.get("9. Liderança")).toBe(1); // F32 era "Inconclusivo"
    expect(r.cidsPorFator.get("5. Horários e Jornada")).toEqual(["F51.2"]);
    expect(r).toMatchObject({ ocorrencias: 4, relacionadas: 2, inconclusivas: 1, diasAfastados: 18 });
  });

  it("setor sem ocorrências: todos os fatores ×1,00", () => {
    const r = calcularEixo3Setor([], matriz);
    expect([...r.fatorPorFator.values()].every((f) => f === 1)).toBe(true);
  });

  it("lista CIDs sem correspondência para o alerta do painel", () => {
    const r = calcularEixo3Setor([{ cid: "F20", relacao: "SIM", diasAfastados: 2 }], matriz);
    expect(r.cidsSemCorrespondencia).toEqual(["F20"]);
    expect([...r.fatorPorFator.values()].every((f) => f === 1)).toBe(true);
  });
});

describe("calcularEixo3Setor — maior afastamento por fator (agravante da FMEA)", () => {
  it("considera só ocorrências relacionadas ao trabalho e compatíveis", () => {
    const matriz = montarMatrizPorFator([
      { fatorId: "jornada", cids: ["F51.2"], naoEspecifico: false },
      { fatorId: "violencia", cids: ["F43.1"], naoEspecifico: false },
    ]);
    const r = calcularEixo3Setor(
      [
        { cid: "F51.2", relacao: "SIM", diasAfastados: 20 },
        { cid: "F51.2", relacao: "SIM", diasAfastados: 4 },
        { cid: "F43.1", relacao: "NAO", diasAfastados: 90 },
      ],
      matriz,
    );
    expect(r.maiorAfastamentoPorFator.get("jornada")).toBe(20);
    expect(r.maiorAfastamentoPorFator.has("violencia")).toBe(false);
  });
});

describe("matrícula e contagem por colaborador", () => {
  const matriz = new Map<string, Set<string>>([["f1", new Set(["F41"])]]);
  const o = (cid: string, relacao: "SIM" | "NAO" | "INCONCLUSIVO", matricula?: string | null, dias = 1) => ({
    cid,
    relacao,
    diasAfastados: dias,
    matricula,
  });

  it("normaliza a matrícula: espaços, texto e número; vazio vira nulo", () => {
    expect(normalizarMatricula("  0042 ")).toBe("0042");
    expect(normalizarMatricula(77)).toBe("77");
    expect(normalizarMatricula("a   b")).toBe("a b");
    expect(normalizarMatricula("   ")).toBeNull();
    expect(normalizarMatricula(null)).toBeNull();
  });

  it("chave da pessoa não diferencia caixa e linha sem matrícula é uma pessoa diferente", () => {
    expect(chaveColaborador("ab1", 0)).toBe(chaveColaborador(" AB1 ", 5));
    expect(chaveColaborador(null, 0)).not.toBe(chaveColaborador(null, 1));
  });

  it("conta colaboradores e atestados separadamente, e a reincidência", () => {
    const r = calcularEixo3Setor(
      [o("F41", "SIM", "100"), o("F32", "NAO", "100"), o("F41", "SIM", "100"), o("F41", "NAO", "200"), o("F41", "SIM", null), o("F41", "SIM", null)],
      matriz,
    );
    expect(r.ocorrencias).toBe(6); // atestados
    expect(r.colaboradoresComAtestado).toBe(4); // 100, 200 e duas linhas sem matrícula
    expect(r.reincidentes).toBe(1); // só a matrícula 100 (3 atestados)
    expect(r.relacionadas).toBe(4); // atestados "Sim"
    expect(r.colaboradoresRelacionados).toBe(3); // 100 conta uma vez + as 2 sem matrícula
  });

  it("só o atestado 'Sim' conta como relacionado; o 'Não' do mesmo colaborador não tira nem põe", () => {
    const r = calcularEixo3Setor([o("F41", "NAO", "7"), o("F41", "SIM", "7"), o("F41", "NAO", "8")], matriz);
    expect(r.colaboradoresRelacionados).toBe(1);
    expect(r.colaboradoresInconclusivos).toBe(0);
    expect(r.fatorPorFator.get("f1")).toBe(1.1);
  });

  it("inconclusivos também são contados por colaborador", () => {
    const r = calcularEixo3Setor([o("F41", "INCONCLUSIVO", "7"), o("F32", "INCONCLUSIVO", "7")], matriz);
    expect(r.inconclusivas).toBe(2);
    expect(r.colaboradoresInconclusivos).toBe(1);
  });

  it("sem matrícula nenhuma (levantamento antigo): colaboradores = atestados, como antes", () => {
    const r = calcularEixo3Setor([o("F41", "SIM"), o("F41", "NAO"), o("F32", "SIM")], matriz);
    expect(r.colaboradoresComAtestado).toBe(r.ocorrencias);
    expect(r.reincidentes).toBe(0);
  });

  it("o agravamento não muda com a quantidade de pessoas ou atestados (×1,10 fixo)", () => {
    const uma = calcularEixo3Setor([o("F41", "SIM", "1")], matriz);
    const muitas = calcularEixo3Setor(Array.from({ length: 9 }, (_, i) => o("F41", "SIM", String(i))), matriz);
    expect(uma.fatorPorFator.get("f1")).toBe(muitas.fatorPorFator.get("f1"));
  });
});
