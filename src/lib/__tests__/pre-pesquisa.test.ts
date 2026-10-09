import { describe, expect, it } from "vitest";
import { PERGUNTAS_PRE_PESQUISA, distribuir, lerPrePesquisa, rotuloOpcao } from "@/lib/pre-pesquisa";

describe("catálogo da pré-pesquisa", () => {
  it("tem as 8 perguntas do cliente, numeradas de 1 a 8, com valores únicos", () => {
    expect(PERGUNTAS_PRE_PESQUISA.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const p of PERGUNTAS_PRE_PESQUISA) {
      expect(new Set(p.opcoes.map((o) => o.valor)).size).toBe(p.opcoes.length);
    }
  });

  it("só a pergunta sobre sexo tem 'Prefiro não responder' (pedido do cliente)", () => {
    const comPrefiro = PERGUNTAS_PRE_PESQUISA.filter((p) => p.opcoes.some((o) => o.valor === "PREFIRO_NAO")).map((p) => p.chave);
    expect(comPrefiro).toEqual(["sexo"]);
  });

  it("idade, peso e altura continuam em faixas (LGPD)", () => {
    for (const chave of ["faixaIdade", "faixaPeso", "faixaAltura"] as const) {
      const p = PERGUNTAS_PRE_PESQUISA.find((x) => x.chave === chave)!;
      expect(p.opcoes.every((o) => /até|de |ou mais|mais de/i.test(o.rotulo))).toBe(true);
    }
  });
});

describe("lerPrePesquisa (obrigatória)", () => {
  const completo = () => {
    const f = new FormData();
    for (const p of PERGUNTAS_PRE_PESQUISA) f.set(p.chave, p.opcoes[0]!.valor);
    return f;
  };

  it("tudo respondido → ok com as 8 respostas", () => {
    const r = lerPrePesquisa(completo());
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.respostas)).toHaveLength(8);
  });

  it("valor fora do catálogo conta como não respondido", () => {
    const f = completo();
    f.set("sexo", "OUTRO_INVENTADO");
    f.set("faixaIdade", "<script>");
    f.set("alcool", "PREFIRO_NAO"); // não existe mais fora da pergunta sobre sexo
    expect(lerPrePesquisa(f)).toEqual({ ok: false, faltando: [2, 3, 6] });
  });

  it("nada marcado → falta tudo", () => {
    expect(lerPrePesquisa(new FormData())).toEqual({ ok: false, faltando: [1, 2, 3, 4, 5, 6, 7, 8] });
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
