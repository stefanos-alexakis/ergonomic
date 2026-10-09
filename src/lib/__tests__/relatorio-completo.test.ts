import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { paraPdf } from "@/lib/relatorio/relatorio-completo-pdf";
import { metodologiaEmMarkdown, secoesMetodologia, type ParametrosMetodologia } from "@/lib/relatorio/metodologia";
import { PRAZOS_PADRAO } from "@/lib/fmea";
import { lerConsultor } from "@/lib/consultores-util";

const params: ParametrosMetodologia = {
  limiteAnonimato: 3,
  regrasPrazo: PRAZOS_PADRAO,
  severidades: [{ fator: "1. Instrução de Trabalho", severidade: 2 }, { fator: "2. Demandas", severidade: null }],
  situacoesPgr: [{ numero: 13, texto: "Ritmo imposto por processo contínuo sem pausas", fator: "4. Ritmo e Cadência" }],
};

describe("paraPdf — só caracteres que a Helvetica do PDF tem", () => {
  it("troca símbolos e remove emojis, mantendo acentos e travessões", () => {
    expect(paraPdf("Índice ≥ 4 → PGR ≈ 3 − 1 😊 — “ok”")).toBe("Índice >= 4 -> PGR ~ 3 - 1  — “ok”");
  });
});

describe("metodologia — fonte única do texto", () => {
  it("usa os valores vigentes passados (mínimo, situações do PGR, severidade sem cadastro)", () => {
    const md = metodologiaEmMarkdown(params);
    expect(md).toContain("menos de 3 respostas");
    expect(md).toContain("| 13 | Ritmo imposto por processo contínuo sem pausas | 4. Ritmo e Cadência |");
    expect(md).toContain("não cadastrada (usa 3)");
    expect(md).toContain("Índice final = Eixo 1 × Fator do Eixo 2 × Fator do Eixo 3");
  });

  it("tem as seções esperadas, na ordem", () => {
    expect(secoesMetodologia(params).map((s) => s.titulo)).toEqual([
      "Visão geral",
      "Eixo 1 — Percepção dos colaboradores",
      "Eixo 2 — Medidas de controle",
      "Eixo 3 — Atestados e afastamentos CID-F",
      "Índice final e faixas",
      "O que vai para o PGR",
      "Matriz FMEA — classificação dos riscos e prioridade",
      "Anonimato e proteção de dados (LGPD)",
    ]);
  });
});

describe("lerConsultor", () => {
  const form = (c: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(c)) f.set(k, v);
    return f;
  };
  it("nome obrigatório; opcionais vazios viram null; e-mail validado", () => {
    expect(lerConsultor(form({ nome: " " })).ok).toBe(false);
    expect(lerConsultor(form({ nome: "Ana", email: "não-é-email" })).ok).toBe(false);
    expect(lerConsultor(form({ nome: "  Ana   Lima ", registro: "CRP 06/1" }))).toEqual({
      ok: true,
      dados: { nome: "Ana Lima", formacao: null, registro: "CRP 06/1", cargo: null, email: null },
    });
  });
});
