import ExcelJS from "exceljs";
import { normalizarCid, normalizarRelacao, type Relacao } from "@/lib/eixo3";

/**
 * Lê a planilha de ocorrências do Eixo 3 no padrão da aba "Ocorrências" da
 * cliente: Setor ou GHE · CID-F · Descrição do CID · Data de início · Total
 * de dias afastados · Relação com o trabalho? · Justificativa / Observação.
 *
 * Colunas reconhecidas pelo NOME (ordem livre). Linha sem setor e sem CID é
 * tratada como vazia — o modelo da cliente traz linhas só com a lista de
 * "Relação" preenchida.
 *
 * Limites contra planilha maliciosa (revisão de segurança): tamanho, número
 * de linhas e assinatura de arquivo .xlsx (zip) conferidos antes de parsear.
 */

export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const LINHAS_MAXIMAS = 5000;

export type LinhaOcorrencia = {
  linha: number;
  setor: string;
  cid: string;
  cidDescricao: string | null;
  dataInicio: Date | null;
  diasAfastados: number | null;
  relacao: Relacao;
  justificativa: string | null;
};

export type ProblemaPlanilha = { linha: number; coluna: string; mensagem: string };

export type ResultadoPlanilhaEixo3 = {
  linhas: LinhaOcorrencia[];
  erros: ProblemaPlanilha[];
  avisos: ProblemaPlanilha[];
};

type Campo = "setor" | "cid" | "descricao" | "data" | "dias" | "relacao" | "justificativa";

const ROTULO_CAMPO: Record<Campo, string> = {
  setor: "Setor ou GHE",
  cid: "CID-F",
  descricao: "Descrição do CID",
  data: "Data de início",
  dias: "Total de dias afastados",
  relacao: "Relação com o trabalho?",
  justificativa: "Justificativa / Observação",
};

function normalizarCabecalho(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function campoDoCabecalho(h: string): Campo | null {
  if (h.startsWith("setor") || h === "ghe") return "setor";
  if (h.startsWith("cid")) return "cid";
  if (h.startsWith("descricao")) return "descricao";
  if (h.startsWith("data")) return "data";
  if (h.includes("dias")) return "dias";
  if (h.startsWith("relacao")) return "relacao";
  if (h.startsWith("justificativa") || h.startsWith("observacao")) return "justificativa";
  return null;
}

const PARECE_IDENTIFICACAO = /\b(nome|colaborador|funcionario|trabalhador|matricula|cpf|rg|codigo)\b/;

/** Valor "cru" de uma célula do exceljs (texto rico, fórmula e link inclusos). */
function valorCelula(v: ExcelJS.CellValue): string | number | Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === "number") return v;
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim() || null;
    if ("result" in v) return valorCelula((v as { result?: ExcelJS.CellValue }).result ?? null);
    if ("text" in v) return String((v as { text: unknown }).text).trim() || null;
  }
  return String(v);
}

function texto(v: string | number | Date | null, max = 2000): string | null {
  if (v === null) return null;
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();
  return s ? s.slice(0, max) : null;
}

/** Data do Excel (Date ou número de série) ou texto dd/mm/aaaa / aaaa-mm-dd. */
function lerData(v: string | number | Date | null): Date | null | "invalida" {
  if (v === null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "invalida" : v;
  if (typeof v === "number") {
    if (v < 1 || v > 80000) return "invalida";
    return new Date(Math.round((v - 25569) * 86400000)); // série do Excel → UTC
  }
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(v);
  if (br) {
    const ano = br[3]!.length === 2 ? 2000 + Number(br[3]) : Number(br[3]);
    const d = new Date(Date.UTC(ano, Number(br[2]) - 1, Number(br[1])));
    return d.getUTCDate() === Number(br[1]) ? d : "invalida";
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(d.getTime()) ? "invalida" : d;
  }
  return "invalida";
}

export async function parsePlanilhaOcorrencias(buffer: Buffer): Promise<ResultadoPlanilhaEixo3> {
  const resultado: ResultadoPlanilhaEixo3 = { linhas: [], erros: [], avisos: [] };
  const erroGeral = (mensagem: string) => {
    resultado.erros.push({ linha: 0, coluna: "-", mensagem });
    resultado.linhas = []; // erro geral: nada da planilha é aproveitado
    return resultado;
  };

  if (buffer.length === 0) return erroGeral("Arquivo vazio.");
  if (buffer.length > TAMANHO_MAXIMO_BYTES) return erroGeral("Arquivo maior que 5 MB.");
  // .xlsx é um zip: começa com "PK\x03\x04". Barra .xls antigo, CSV, PDF renomeado etc.
  if (buffer.subarray(0, 4).toString("binary") !== "PK\u0003\u0004") {
    return erroGeral("O arquivo não é uma planilha .xlsx. Salve como \"Pasta de Trabalho do Excel (.xlsx)\".");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as never);
  } catch {
    return erroGeral("Não foi possível ler a planilha. Confira se o arquivo não está corrompido.");
  }

  const sheet =
    workbook.worksheets.find((w) => normalizarCabecalho(w.name).startsWith("ocorr")) ?? workbook.worksheets[0];
  if (!sheet) return erroGeral("Planilha sem abas.");

  const colunas = new Map<Campo, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    const h = normalizarCabecalho(valorCelula(cell.value));
    if (!h) return;
    const campo = campoDoCabecalho(h);
    if (campo && !colunas.has(campo)) {
      colunas.set(campo, col);
    } else if (PARECE_IDENTIFICACAO.test(h)) {
      resultado.avisos.push({
        linha: 1,
        coluna: String(valorCelula(cell.value)),
        mensagem: "Coluna ignorada — o Eixo 3 não guarda identificação do trabalhador (LGPD).",
      });
    } else if (!campo) {
      resultado.avisos.push({ linha: 1, coluna: String(valorCelula(cell.value)), mensagem: "Coluna não reconhecida, ignorada." });
    }
  });

  const faltando = (["setor", "cid", "relacao"] as const).filter((c) => !colunas.has(c));
  if (faltando.length > 0) {
    return erroGeral(
      `Cabeçalho incompleto: falta ${faltando.map((c) => `"${ROTULO_CAMPO[c]}"`).join(", ")}. Use o modelo da plataforma.`,
    );
  }

  let contadas = 0;
  let excedeu = false;
  sheet.eachRow({ includeEmpty: false }, (row, numero) => {
    if (numero === 1 || excedeu) return;
    const ler = (campo: Campo) => {
      const col = colunas.get(campo);
      return col ? valorCelula(row.getCell(col).value) : null;
    };

    const setorBruto = ler("setor");
    const cidBruto = ler("cid");
    if (setorBruto === null && cidBruto === null) return; // linha vazia (ex.: só "Relação" pré-preenchida)

    if (++contadas > LINHAS_MAXIMAS) {
      excedeu = true;
      return;
    }

    const erro = (campo: Campo, mensagem: string) =>
      resultado.erros.push({ linha: numero, coluna: ROTULO_CAMPO[campo], mensagem });

    const setor = texto(setorBruto, 200);
    if (!setor) erro("setor", "Setor ou GHE em branco.");
    else if (setor.length > 120) erro("setor", "Nome do setor muito longo (máx. 120 caracteres).");

    const cid = normalizarCid(cidBruto);
    if (!cid) {
      erro(
        "cid",
        cidBruto === null
          ? "CID-F em branco."
          : `CID "${texto(cidBruto, 30)}" inválido — o Eixo 3 aceita só CID do capítulo F, no formato F41 ou F41.1.`,
      );
    }

    const relacao = normalizarRelacao(ler("relacao"));
    if (!relacao) erro("relacao", 'Preencha com "Sim", "Não" ou "Inconclusivo".');

    const diasBruto = ler("dias");
    let dias: number | null = null;
    if (diasBruto !== null) {
      const n = typeof diasBruto === "number" ? diasBruto : Number(String(diasBruto).replace(",", "."));
      if (!Number.isInteger(n) || n < 0 || n > 3650) erro("dias", "Total de dias deve ser um número inteiro entre 0 e 3650.");
      else dias = n;
    }

    const data = lerData(ler("data"));
    if (data === "invalida") erro("data", "Data de início inválida — use dd/mm/aaaa.");
    else if (data === null) resultado.avisos.push({ linha: numero, coluna: ROTULO_CAMPO.data, mensagem: "Sem data de início." });

    if (setor && setor.length <= 120 && cid && relacao && data !== "invalida" && (diasBruto === null || dias !== null)) {
      resultado.linhas.push({
        linha: numero,
        setor,
        cid,
        cidDescricao: texto(ler("descricao"), 300),
        dataInicio: data,
        diasAfastados: dias,
        relacao,
        justificativa: texto(ler("justificativa")),
      });
    }
  });

  if (excedeu) return erroGeral(`A planilha passa de ${LINHAS_MAXIMAS} ocorrências — divida em mais de um levantamento.`);
  return resultado;
}
