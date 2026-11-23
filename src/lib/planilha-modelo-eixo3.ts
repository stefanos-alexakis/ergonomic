import ExcelJS from "exceljs";
import { CIDS_Z, ROTULO_GRUPO } from "@/lib/cids-z";

/**
 * Modelo para download da planilha de ocorrências do Eixo 3 — as colunas
 * exatas da aba "Ocorrências" da cliente, com a lista Sim/Não/Inconclusivo
 * e as orientações técnicas numa segunda aba. A aba de ocorrências vai SEM
 * linha de exemplo de propósito: uma linha de exemplo esquecida viraria uma
 * ocorrência de verdade na publicação. O exemplo fica na aba de orientações.
 */

export const CABECALHO_OCORRENCIAS = [
  "Setor ou GHE",
  "CID (F ou Z)",
  "DESCRIÇÃO DO CID",
  "Data de início",
  "Total de dias afastados",
  "Relação com o trabalho?",
  "Justificativa / Observação",
  "Matrícula",
];

export const ORIENTACOES_EIXO3 = [
  "Registre todos os atestados e afastamentos do período analisado, uma linha por ocorrência. Os CID dos capítulos F e Z entram na análise; os de outros capítulos (ex.: M54.5) entram só na contagem do total de atestados, e o código não é guardado. A aba 'CIDs Z aceitos' lista os códigos Z reconhecidos e como cada um é tratado.",
  "Não informe nome nem CPF do colaborador. A matrícula é opcional e serve para contar colaboradores (e não só atestados) e identificar reincidência; ela aparece apenas na tela do Eixo 3, nunca nos relatórios.",
  "Preencha a matrícula sempre igual para o mesmo colaborador (a coluna já vem como texto, para não perder zeros à esquerda). Linha sem matrícula conta como um colaborador diferente.",
  "Use o mesmo nome de setor cadastrado na plataforma (a plataforma ajuda a associar nomes diferentes na publicação).",
  "A coluna 'Relação com o trabalho' (Relacionado ao trabalho, Parcialmente relacionado ou Não relacionado) deve ser preenchida com base no conhecimento do RH/DP, relatos do colaborador ou parecer médico disponível. Só 'Relacionado ao trabalho' agrava o índice. Para outros CIDs pode ficar em branco.",
  "Os CID F e Z são possibilidades de agravos/desfechos compatíveis ou associados, não diagnósticos causados automaticamente pelo fator de risco psicossocial.",
  "CIDs Z: o grupo A agrava fatores (como os CID F, quando a relação é 'Relacionado ao trabalho'); o grupo B é só indicador; o grupo C (ruído, vibração, fumaça) é risco físico/ambiental e deve ser tratado no PGR de riscos físicos. Código Z fora da lista é aceito, mas não agrava nenhum fator.",
  "A presença de um CID F ou Z em atestado não comprova, isoladamente, nexo causal com o trabalho e não deve ser usada para atribuir causalidade individual.",
  "F43.1 deve ser considerado somente quando houver exposição a evento traumático compatível e avaliação clínica; não deve ser usado como sinônimo de estresse ocupacional.",
  "F51.2 é pertinente quando houver alteração não orgânica do ciclo vigília-sono clinicamente identificada; a organização da jornada pode ser um elemento a investigar.",
  "Os dados de atestados/afastamentos funcionam como indicadores agravantes da análise coletiva por setor, e não como prova isolada de nexo ocupacional.",
];

export async function gerarPlanilhaModeloEixo3(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const ocorrencias = workbook.addWorksheet("Ocorrências");
  ocorrencias.columns = [
    { width: 26 },
    { width: 10 },
    { width: 42 },
    { width: 14, style: { numFmt: "dd/mm/yyyy" } },
    { width: 14 },
    { width: 22 },
    { width: 48 },
    { width: 16, style: { numFmt: "@" } }, // texto: preserva zeros à esquerda
  ];
  ocorrencias.addRow(CABECALHO_OCORRENCIAS);
  ocorrencias.getRow(1).font = { bold: true };
  ocorrencias.views = [{ state: "frozen", ySplit: 1 }];
  for (let linha = 2; linha <= 1000; linha++) {
    ocorrencias.getCell(`F${linha}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Relacionado ao trabalho,Parcialmente relacionado,Não relacionado"'],
      showErrorMessage: true,
      errorTitle: "Relação com o trabalho",
      error: "Escolha Relacionado ao trabalho, Parcialmente relacionado ou Não relacionado.",
    };
  }

  const orientacoes = workbook.addWorksheet("Orientações");
  orientacoes.columns = [{ width: 120 }];
  orientacoes.addRow(["Orientações de preenchimento — Eixo 3 (atestados e afastamentos CID F e Z)"]).font = { bold: true };
  orientacoes.addRow([]);
  for (const o of ORIENTACOES_EIXO3) orientacoes.addRow([`• ${o}`]).alignment = { wrapText: true };
  orientacoes.addRow([]);
  orientacoes.addRow(["Exemplo de linha (não copie para a aba Ocorrências):"]).font = { bold: true };
  orientacoes.addRow([
    "Produção | F43.2 | Transtornos de adaptação | 15/03/2025 | 10 | Relacionado ao trabalho | Relato de sobrecarga por metas",
  ]);

  const zs = workbook.addWorksheet("CIDs Z aceitos");
  zs.columns = [{ width: 10 }, { width: 70 }, { width: 30 }];
  zs.addRow(["CID", "Descrição", "Tratamento"]).font = { bold: true };
  for (const c of CIDS_Z) zs.addRow([c.cid, c.descricao, ROTULO_GRUPO[c.grupo]]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
