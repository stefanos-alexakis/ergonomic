import { describe, expect, it } from "vitest";
import { filtrarPorNome, normalizarParaBusca } from "../filtro-nome";

const empresas = [
  { nome: "Metalúrgica Horizonte" },
  { nome: "Usina São João" },
  { nome: "Horizonte Alimentos" },
  { nome: "Cooperativa Avícola" },
];

describe("filtrarPorNome", () => {
  it("acha por qualquer parte do nome", () => {
    expect(filtrarPorNome(empresas, "horizon").map((e) => e.nome)).toEqual([
      "Metalúrgica Horizonte",
      "Horizonte Alimentos",
    ]);
  });

  it("ignora maiúsculas e acentos, nos dois sentidos", () => {
    expect(filtrarPorNome(empresas, "METALURGICA")).toHaveLength(1);
    expect(filtrarPorNome(empresas, "sao joao")).toHaveLength(1);
    expect(filtrarPorNome(empresas, "avicola")).toHaveLength(1);
    expect(filtrarPorNome([{ nome: "Avicola Sul" }], "Avícola")).toHaveLength(1);
  });

  it("ignora espaços sobrando", () => {
    expect(filtrarPorNome(empresas, "   usina    são ")).toHaveLength(1);
  });

  it("termo vazio ou só espaços devolve tudo; sem acerto devolve vazio", () => {
    expect(filtrarPorNome(empresas, "")).toHaveLength(4);
    expect(filtrarPorNome(empresas, "   ")).toHaveLength(4);
    expect(filtrarPorNome(empresas, undefined)).toHaveLength(4);
    expect(filtrarPorNome(empresas, "xyz")).toHaveLength(0);
  });

  it("normaliza o texto de busca", () => {
    expect(normalizarParaBusca("  Ação  ÁGIL ")).toBe("acao agil");
  });
});
