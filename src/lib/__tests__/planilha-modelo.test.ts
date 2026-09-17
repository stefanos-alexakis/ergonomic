import { describe, expect, it } from "vitest";
import { gerarPlanilhaModelo } from "@/lib/planilha-modelo";
import { parsePlanilhaEstrutura } from "@/lib/planilha-estrutura";

describe("gerarPlanilhaModelo", () => {
  it("gera um .xlsx que o próprio parser aceita sem erros", async () => {
    const buf = await gerarPlanilhaModelo();
    const r = await parsePlanilhaEstrutura(buf);

    expect(r.erros).toHaveLength(0);
    expect(r.setores.sort()).toEqual(["Administrativo", "Comercial", "Produção"]);
    expect(r.departamentos.sort()).toEqual([
      "Financeiro",
      "Linha 1",
      "Linha 2",
      "Recursos Humanos",
    ]);
  });
});
