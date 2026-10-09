import ExcelJS from "exceljs";
import { OPCOES_ESCALA, calcularDistribuicao, type DistribuicaoPesquisa } from "@/lib/distribuicao-respostas";
import { seguroParaPlanilha } from "@/lib/plano-acao-util";

const VERMELHO = "FFDC2626";
const ROSA = "FFFEE2E2";

/** Nome de aba válido no Excel: até 31 caracteres, sem : \ / ? * [ ], e único. */
export function nomeDeAba(nome: string, usados: Set<string>): string {
  const base = nome.replace(/[:\\/?*[\]]/g, "-").trim().slice(0, 31) || "Setor";
  let n = base;
  for (let i = 2; usados.has(n.toLowerCase()); i++) n = `${base.slice(0, 31 - String(i).length - 1)} ${i}`;
  usados.add(n.toLowerCase());
  return n;
}

function preencherAba(ws: ExcelJS.Worksheet, d: DistribuicaoPesquisa, titulo: string) {
  ws.columns = [{ width: 70 }, ...OPCOES_ESCALA.map(() => ({ width: 14 })), { width: 12 }];
  ws.addRow([`${d.respondentes} respondentes, ${titulo}`]).font = { bold: true, size: 13 };
  ws.addRow(["Destaque: 50% ou mais dos respondentes em Frequentemente ou Sempre (expostos)."]).font = {
    italic: true,
    color: { argb: "FF71717A" },
  };
  for (const f of d.fatores) {
    ws.addRow([]);
    const cab = ws.addRow([
      `${f.nome}${f.indice !== null ? ` — índice ${f.indice.toFixed(2).replace(".", ",")}` : ""}`,
      ...OPCOES_ESCALA.map((o) => o.rotulo),
      "% expostos",
    ]);
    cab.font = { bold: true };
    cab.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } }));
    for (const l of f.linhas) {
      const row = ws.addRow([
        seguroParaPlanilha(`${l.pergunta.numero}. ${l.pergunta.texto}`),
        ...OPCOES_ESCALA.map((o) => l.contagem[o.valor] || null),
        l.parcelaExpostos,
      ]);
      row.getCell(7).numFmt = "0%";
      row.alignment = { vertical: "top", wrapText: true };
      if (l.destaque) {
        row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROSA } };
        for (const col of [5, 6]) {
          if (row.getCell(col).value) {
            row.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERMELHO } };
            row.getCell(col).font = { bold: true, color: { argb: "FFFFFFFF" } };
          }
        }
        row.getCell(7).font = { bold: true, color: { argb: VERMELHO } };
      }
    }
  }
}

/**
 * Planilha no formato que a consultoria já usa: aba "Todos" e uma aba por
 * setor com respostas suficientes (setor abaixo do mínimo não ganha aba).
 */
export async function gerarDistribuicaoExcel(pesquisaId: string, titulo: string): Promise<Buffer | null> {
  const todos = await calcularDistribuicao(pesquisaId);
  if (!todos.suficiente) return null;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma FRPRT";
  wb.title = titulo;
  const usados = new Set<string>();
  preencherAba(wb.addWorksheet(nomeDeAba("Todos", usados)), todos, "todos os setores");
  for (const s of todos.setores.filter((x) => !x.suprimido)) {
    const d = await calcularDistribuicao(pesquisaId, s.id);
    preencherAba(wb.addWorksheet(nomeDeAba(s.nome, usados)), d, s.nome);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
