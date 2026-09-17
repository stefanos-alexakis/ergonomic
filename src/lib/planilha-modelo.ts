import ExcelJS from "exceljs";

/**
 * Gera o modelo de planilha oferecido para download antes da importação
 * — mesmas colunas que `parsePlanilhaEstrutura` reconhece
 * (`planilha-estrutura.ts`), com linhas de exemplo cobrindo os casos que
 * o parser já aceita: setor com departamento, e um setor sem
 * departamento na mesma linha (célula vazia é válida). O teste
 * `planilha-modelo.test.ts` faz o roundtrip por `parsePlanilhaEstrutura`
 * para garantir que o modelo que a gente distribui é sempre aceito pelo
 * próprio parser.
 */
export async function gerarPlanilhaModelo(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Estrutura");

  sheet.columns = [{ header: "Setor", width: 28 }, { header: "Departamento", width: 28 }];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow(["Produção", "Linha 1"]);
  sheet.addRow(["Produção", "Linha 2"]);
  sheet.addRow(["Administrativo", "Financeiro"]);
  sheet.addRow(["Administrativo", "Recursos Humanos"]);
  sheet.addRow(["Comercial", ""]); // setor sem departamento cadastrado ainda — linha válida

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
