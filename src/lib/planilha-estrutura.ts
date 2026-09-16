import ExcelJS from "exceljs";

/**
 * Formato esperado da planilha de importação (tasks.md Fase 3):
 * uma aba com 4 colunas, cabeçalho na primeira linha —
 * "Setor" | "Departamento" | "Segmento" | "Função" — cada célula
 * preenchida é um valor a cadastrar naquele catálogo; células vazias são
 * ignoradas (nem toda linha precisa ter as 4 colunas preenchidas).
 */

const COLUNAS_ESPERADAS = ["setor", "departamento", "segmento", "funcao", "função"];

export type ErroLinhaPlanilha = { linha: number; coluna: string; mensagem: string };

export type ResultadoParsePlanilha = {
  setores: string[];
  departamentos: string[];
  segmentos: string[];
  funcoes: string[];
  erros: ErroLinhaPlanilha[];
};

function normalizarCabecalho(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export async function parsePlanilhaEstrutura(
  buffer: Buffer | ArrayBuffer,
): Promise<ResultadoParsePlanilha> {
  const resultado: ResultadoParsePlanilha = {
    setores: [],
    departamentos: [],
    segmentos: [],
    funcoes: [],
    erros: [],
  };

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    resultado.erros.push({ linha: 0, coluna: "-", mensagem: "Planilha vazia ou sem abas." });
    return resultado;
  }

  const cabecalho = sheet.getRow(1);
  const indiceColuna: Record<string, number> = {};
  cabecalho.eachCell((cell, colNumber) => {
    const nome = normalizarCabecalho(cell.value);
    if (COLUNAS_ESPERADAS.includes(nome)) {
      const chave = nome === "função" ? "funcao" : nome;
      indiceColuna[chave] = colNumber;
    }
  });

  if (Object.keys(indiceColuna).length === 0) {
    resultado.erros.push({
      linha: 1,
      coluna: "-",
      mensagem:
        'Cabeçalho não reconhecido. Use as colunas "Setor", "Departamento", "Segmento", "Função".',
    });
    return resultado;
  }

  const vistos = {
    setor: new Set<string>(),
    departamento: new Set<string>(),
    segmento: new Set<string>(),
    funcao: new Set<string>(),
  };

  for (let linha = 2; linha <= sheet.rowCount; linha++) {
    const row = sheet.getRow(linha);
    if (row.cellCount === 0) continue;

    for (const [chave, coluna] of Object.entries(indiceColuna) as [keyof typeof vistos, number][]) {
      const valorBruto = row.getCell(coluna).value;
      const valor = String(valorBruto ?? "").trim();
      if (!valor) continue;
      if (valor.length > 120) {
        resultado.erros.push({
          linha,
          coluna: chave,
          mensagem: `Valor muito longo (máx. 120 caracteres): "${valor.slice(0, 40)}..."`,
        });
        continue;
      }
      vistos[chave].add(valor);
    }
  }

  resultado.setores = Array.from(vistos.setor);
  resultado.departamentos = Array.from(vistos.departamento);
  resultado.segmentos = Array.from(vistos.segmento);
  resultado.funcoes = Array.from(vistos.funcao);

  return resultado;
}
