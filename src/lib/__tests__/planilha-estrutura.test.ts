import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parsePlanilhaEstrutura } from "@/lib/planilha-estrutura";

async function gerarPlanilha(linhas: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Estrutura");
  sheet.addRow(["Setor", "Departamento", "Segmento", "Função"]);
  for (const linha of linhas) sheet.addRow(linha);
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe("parsePlanilhaEstrutura", () => {
  it("lê setores/departamentos/segmentos/funções e remove duplicados", async () => {
    const buf = await gerarPlanilha([
      ["Produção", "Linha 1", "", "Operador"],
      ["Produção", "Linha 2", "", "Operador"], // "Produção" e "Operador" repetidos
      ["Administrativo", "Financeiro", "Backoffice", "Analista"],
    ]);
    const r = await parsePlanilhaEstrutura(buf);
    expect(r.erros).toHaveLength(0);
    expect(r.setores.sort()).toEqual(["Administrativo", "Produção"]);
    expect(r.departamentos.sort()).toEqual(["Financeiro", "Linha 1", "Linha 2"]);
    expect(r.segmentos).toEqual(["Backoffice"]);
    expect(r.funcoes.sort()).toEqual(["Analista", "Operador"]);
  });

  it("ignora células vazias sem quebrar", async () => {
    const buf = await gerarPlanilha([["Só Setor", "", "", ""]]);
    const r = await parsePlanilhaEstrutura(buf);
    expect(r.setores).toEqual(["Só Setor"]);
    expect(r.departamentos).toEqual([]);
  });

  it("reporta erro quando o cabeçalho não é reconhecido", async () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Estrutura");
    sheet.addRow(["Coluna A", "Coluna B"]);
    sheet.addRow(["x", "y"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());

    const r = await parsePlanilhaEstrutura(buf);
    expect(r.erros.length).toBeGreaterThan(0);
    expect(r.setores).toHaveLength(0);
  });

  it("reporta erro por linha/coluna quando o valor é absurdamente longo, sem parar a importação", async () => {
    const valorLongo = "x".repeat(200);
    const buf = await gerarPlanilha([
      ["Setor Válido", "", "", ""],
      [valorLongo, "", "", ""],
    ]);
    const r = await parsePlanilhaEstrutura(buf);
    expect(r.setores).toEqual(["Setor Válido"]);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]?.linha).toBe(3);
    expect(r.erros[0]?.coluna).toBe("setor");
  });
});
