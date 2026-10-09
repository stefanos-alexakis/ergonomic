import { describe, expect, it } from "vitest";
import { PERGUNTAS_PRE_PESQUISA, distribuir, lerPrePesquisa, rotuloOpcao } from "@/lib/pre-pesquisa";

describe("catálogo da pré-pesquisa", () => {
  it("tem as 8 perguntas do cliente, numeradas de 1 a 8, com valores únicos", () => {
    expect(PERGUNTAS_PRE_PESQUISA.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const p of PERGUNTAS_PRE_PESQUISA) {
      expect(new Set(p.opcoes.map((o) => o.valor)).size).toBe(p.opcoes.length);
    }
  });

  it("idade, peso e altura são faixas e têm 'Prefiro não responder' (LGPD)", () => {
    for (const chave of ["faixaIdade", "faixaPeso", "faixaAltura"] as const) {
      const p = PERGUNTAS_PRE_PESQUISA.find((x) => x.chave === chave)!;
      expect(p.opcoes.some((o) => o.valor === "PREFIRO_NAO")).toBe(true);
    }
  });
});

describe("lerPrePesquisa", () => {
  it("aceita só valores do catálogo; o resto vira 'não respondeu'", () => {
    const f = new FormData();
    f.set("tempoEmpresa", "1_3");
    f.set("sexo", "OUTRO_INVENTADO");
    f.set("faixaIdade", "<script>");
    const { respostas, vazia } = lerPrePesquisa(f);
    expect(vazia).toBe(false);
    expect(respostas.tempoEmpresa).toBe("1_3");
    expect(respostas.sexo).toBeNull();
    expect(respostas.faixaIdade).toBeNull();
    expect(respostas.apostas).toBeNull();
  });

  it("nada marcado → vazia", () => {
    expect(lerPrePesquisa(new FormData()).vazia).toBe(true);
  });
});

describe("distribuir", () => {
  it("conta por opção, com % sobre quem respondeu a pergunta", () => {
    const d = distribuir([{ sexo: "FEMININO" }, { sexo: "FEMININO" }, { sexo: "MASCULINO" }, { sexo: null }]);
    const sexo = d.find((x) => x.pergunta.chave === "sexo")!;
    expect(sexo.respondentes).toBe(3);
    expect(sexo.semResposta).toBe(1);
    expect(sexo.opcoes.find((o) => o.valor === "FEMININO")).toMatchObject({ quantidade: 2, percentual: 2 / 3 });
  });

  it("rotuloOpcao", () => {
    expect(rotuloOpcao("alcool", "DIARIO")).toBe("Diariamente ou quase diariamente");
    expect(rotuloOpcao("alcool", null)).toBe("Não respondeu");
  });
});
