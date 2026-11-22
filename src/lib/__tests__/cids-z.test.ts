import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calcularEixo3Setor, fatoresCompativeis, montarMatrizPorFator, normalizarCid } from "@/lib/eixo3";
import {
  CIDS_Z,
  alertaDoCid,
  capituloDoCid,
  cidsZQueAgravam,
  ehCidSensivel,
  ehZReconhecidoSemAgravo,
  infoCidZ,
  numeroDoFator,
} from "@/lib/cids-z";

const matrizJson = JSON.parse(
  readFileSync(join(process.cwd(), "prisma", "seed-data", "matriz-cid-v2.json"), "utf-8"),
) as { ordem: number; cids: string[]; naoEspecifico: boolean }[];
const v2 = JSON.parse(readFileSync(join(process.cwd(), "prisma", "seed-data", "perguntas-v2.json"), "utf-8")) as {
  ordemGlobal: number;
  dimensao: string;
}[];

/** Mesma montagem da plataforma: fator = dimensão (1–13), com a ordem do fator. */
const matriz = montarMatrizPorFator(
  matrizJson.map((m) => {
    const dim = v2.find((p) => p.ordemGlobal === m.ordem)!.dimensao;
    return { fatorId: dim, cids: m.cids, naoEspecifico: m.naoEspecifico, ordemFator: Number.parseInt(dim, 10) };
  }),
);
const fator = (n: number) => [...matriz.keys()].find((k) => Number.parseInt(k, 10) === n)!;

describe("tabela dos CIDs Z", () => {
  it("tem os 36 códigos da proposta, sem repetição", () => {
    expect(CIDS_Z).toHaveLength(36);
    expect(new Set(CIDS_Z.map((c) => c.cid)).size).toBe(36);
  });

  it("grupo A tem fatores; B e C não agravam nada", () => {
    for (const c of CIDS_Z) {
      if (c.grupo === "A") expect(c.fatores.length).toBeGreaterThan(0);
      else expect(c.fatores).toEqual([]);
    }
    expect(CIDS_Z.filter((c) => c.grupo === "A").map((c) => c.cid)).toEqual([
      "Z04.4", "Z56.0", "Z56.1", "Z56.2", "Z56.3", "Z56.4", "Z56.5", "Z60.5", "Z73.0", "Z73.3",
    ]);
  });

  it("alertas e sensibilidade", () => {
    expect(alertaDoCid("Z72.1")).toBe("SUBSTANCIAS");
    expect(alertaDoCid("Z91.5")).toBe("AUTOLESAO");
    expect(alertaDoCid("Z57.0")).toBe("AGENTE_FISICO");
    expect(alertaDoCid("Z73.0")).toBeNull();
    expect(ehCidSensivel("Z04.4")).toBe(true);
    expect(ehCidSensivel("Z91.5")).toBe(true);
    expect(ehCidSensivel("Z72.1")).toBe(true);
    expect(ehCidSensivel("Z73.0")).toBe(false);
    expect(ehCidSensivel("F41.1")).toBe(false);
  });

  it("capítulo do CID", () => {
    expect(capituloDoCid("Z73.0")).toBe("Z");
    expect(capituloDoCid("F41")).toBe("F");
  });
});

describe("numeroDoFator", () => {
  it("lê o número do prefixo do nome da dimensão (a ordem do banco reinicia por bloco)", () => {
    expect(numeroDoFator("5. Horários e Jornada")).toBe(5);
    expect(numeroDoFator("13. Trabalho Isolado")).toBe(13);
    expect(numeroDoFator("Sem número")).toBe(0);
  });
});

describe("normalizarCid com capítulo Z", () => {
  it("aceita Z em várias grafias", () => {
    expect(normalizarCid("z73.0")).toBe("Z73.0");
    expect(normalizarCid("Z 73 .0")).toBe("Z73.0");
    expect(normalizarCid("Z730")).toBe("Z73.0");
    expect(normalizarCid("Z73.3 - Stress não classificado")).toBe("Z73.3");
    expect(normalizarCid("Z72")).toBe("Z72");
  });
  it("continua recusando outros capítulos e formatos inválidos", () => {
    expect(normalizarCid("M54.5")).toBeNull();
    expect(normalizarCid("Z7")).toBeNull();
    expect(normalizarCid("Z7301")).toBeNull();
  });
});

describe("matriz com CIDs Z do grupo A", () => {
  it("cidsZQueAgravam: Z73.3 agrava Demandas, Controle, Ritmo e Liderança", () => {
    for (const n of [2, 3, 4, 9]) expect(cidsZQueAgravam(n)).toContain("Z73.3");
    expect(cidsZQueAgravam(1)).toContain("Z56.5");
    expect(cidsZQueAgravam(12)).toEqual([]);
  });

  it("Z73.0 agrava exatamente Demandas, Ritmo, Horários e Equilíbrio", () => {
    const f = fatoresCompativeis("Z73.0", matriz).map((x) => Number.parseInt(x, 10)).sort((a, b) => a - b);
    expect(f).toEqual([2, 4, 5, 10]);
  });

  it("Z56.1 agrava Segurança no emprego e Gestão de mudanças", () => {
    expect(fatoresCompativeis("Z56.1", matriz).map((x) => Number.parseInt(x, 10)).sort((a, b) => a - b)).toEqual([6, 7]);
  });

  it("Z04.4 e Z60.5 agravam Violência (11)", () => {
    expect(fatoresCompativeis("Z04.4", matriz)).toEqual([fator(11)]);
    expect(fatoresCompativeis("Z60.5", matriz).map((x) => Number.parseInt(x, 10)).sort((a, b) => a - b)).toEqual([8, 11]);
  });

  it("B, C e Z fora da lista não agravam nenhum fator", () => {
    for (const c of ["Z72.1", "Z57.0", "Z65.9", "Z91.5", "Z99.9", "Z56.9"]) {
      expect(fatoresCompativeis(c, matriz)).toEqual([]);
    }
  });

  it("não interfere nas regras dos CIDs F existentes", () => {
    expect(fatoresCompativeis("F41.1", matriz)).toHaveLength(13);
    expect(fatoresCompativeis("F43.1", matriz)).toHaveLength(2);
  });

  it("situação 'Não específico' continua sem agravar, também para Z", () => {
    const so = montarMatrizPorFator([{ fatorId: "x", cids: [], naoEspecifico: true, ordemFator: 2 }]);
    expect(fatoresCompativeis("Z73.0", so)).toEqual([]);
  });
});

describe("calcularEixo3Setor com Z", () => {
  it("Z do grupo A relacionado agrava; relação Não ou Inconclusivo não", () => {
    const sim = calcularEixo3Setor([{ cid: "Z73.0", relacao: "SIM", diasAfastados: 20 }], matriz);
    expect(sim.fatorPorFator.get(fator(2))).toBe(1.1);
    expect(sim.fatorPorFator.get(fator(11))).toBe(1);
    expect(sim.maiorAfastamentoPorFator.get(fator(2))).toBe(20);
    const nao = calcularEixo3Setor(
      [
        { cid: "Z73.0", relacao: "NAO", diasAfastados: 5 },
        { cid: "Z73.3", relacao: "INCONCLUSIVO", diasAfastados: 5 },
      ],
      matriz,
    );
    expect([...nao.fatorPorFator.values()].every((v) => v === 1)).toBe(true);
  });

  it("Z dos grupos B e C conta nos indicadores, não agrava e não é 'sem correspondência'", () => {
    const r = calcularEixo3Setor(
      [
        { cid: "Z72.1", relacao: "SIM", diasAfastados: 3 },
        { cid: "Z57.0", relacao: "SIM", diasAfastados: 0 },
        { cid: "Z99.9", relacao: "SIM", diasAfastados: 0 },
      ],
      matriz,
    );
    expect(r.ocorrencias).toBe(3);
    expect([...r.fatorPorFator.values()].every((v) => v === 1)).toBe(true);
    expect(r.cidsSemCorrespondencia).toEqual(["Z99.9"]);
    expect(ehZReconhecidoSemAgravo("Z72.1")).toBe(true);
    expect(ehZReconhecidoSemAgravo("Z73.0")).toBe(false);
    expect(infoCidZ("Z99.9")).toBeUndefined();
  });
});
