import { describe, expect, it } from "vitest";
import { aplicarSupressaoGruposPequenos } from "@/lib/agregacao";

describe("aplicarSupressaoGruposPequenos", () => {
  it("não suprime nada quando todos os grupos atingem o limite", () => {
    const r = aplicarSupressaoGruposPequenos(
      [{ nome: "A", total: 10 }, { nome: "B", total: 8 }],
      5,
    );
    expect(r.every((g) => !g.suprimido)).toBe(true);
  });

  it("suprime um grupo abaixo do limite", () => {
    const r = aplicarSupressaoGruposPequenos(
      [{ nome: "A", total: 10 }, { nome: "B", total: 3 }],
      5,
    );
    expect(r.find((g) => g.nome === "B")!.suprimido).toBe(true);
  });

  it("suprime também o segundo menor quando só um ficaria escondido (ataque da subtração)", () => {
    // B tem 3 (< limite) e seria o único suprimido; sem a regra extra,
    // total - A revelaria que B = 3.
    const r = aplicarSupressaoGruposPequenos(
      [{ nome: "A", total: 20 }, { nome: "B", total: 3 }, { nome: "C", total: 15 }],
      5,
    );
    const suprimidos = r.filter((g) => g.suprimido).map((g) => g.nome);
    expect(suprimidos).toContain("B");
    expect(suprimidos).toContain("C"); // segundo menor entre os não suprimidos
    expect(suprimidos).not.toContain("A");
  });

  it("não precisa suprimir um segundo grupo quando dois ou mais já ficaram abaixo do limite", () => {
    const r = aplicarSupressaoGruposPequenos(
      [{ nome: "A", total: 20 }, { nome: "B", total: 3 }, { nome: "C", total: 2 }],
      5,
    );
    const suprimidos = r.filter((g) => g.suprimido).map((g) => g.nome);
    expect(suprimidos.sort()).toEqual(["B", "C"]);
  });

  it("lida com um único grupo sem quebrar", () => {
    const r = aplicarSupressaoGruposPequenos([{ nome: "A", total: 2 }], 5);
    expect(r).toHaveLength(1);
    expect(r.at(0)?.suprimido).toBe(true);
  });
});
