import ExcelJS from "exceljs";

/**
 * Modelo para download da planilha de ocorrências do Eixo 3 — as colunas
 * exatas da aba "Ocorrências" da cliente, com a lista Sim/Não/Inconclusivo
 * e as orientações técnicas numa segunda aba. A aba de ocorrências vai SEM
 * linha de exemplo de propósito: uma linha de exemplo esquecida viraria uma
 * ocorrência de verdade na publicação. O exemplo fica na aba de orientações.
 */

export const CABECALHO_OCORRENCIAS = [
  "Setor ou GHE",
  "CID-F",
  "DESCRIÇÃO DO CID",
  "Data de início",
  "Total de dias afastados",
  "Relação com o trabalho?",
  "Justificativa / Observação",
];

export const ORIENTACOES_EIXO3 = [
  "Registre todos os atestados e afastamentos com CID iniciado em F do período analisado, uma linha por ocorrência.",
  "Não identifique o colaborador — sem nome, matrícula ou CPF. O levantamento é por CID e setor, preservando o sigilo.",
  "Use o mesmo nome de setor cadastrado na plataforma (a plataforma ajuda a associar nomes diferentes na publicação).",
  "A coluna 'Relação com o trabalho' deve ser preenchida com base no conhecimento do RH/DP, relatos do colaborador ou parecer médico disponível.",
  "Os CID F são possibilidades de agravos/desfechos compatíveis ou associados, não diagnósticos causados automaticamente pelo fator de risco psicossocial.",
  "A presença de um CID F em atestado não comprova, isoladamente, nexo causal com o trabalho e não deve ser usada para atribuir causalidade individual.",
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
  ];
  ocorrencias.addRow(CABECALHO_OCORRENCIAS);
  ocorrencias.getRow(1).font = { bold: true };
  ocorrencias.views = [{ state: "frozen", ySplit: 1 }];
  for (let linha = 2; linha <= 1000; linha++) {
    ocorrencias.getCell(`F${linha}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Sim,Não,Inconclusivo"'],
      showErrorMessage: true,
      errorTitle: "Relação com o trabalho",
      error: "Escolha Sim, Não ou Inconclusivo.",
    };
  }

  const orientacoes = workbook.addWorksheet("Orientações");
  orientacoes.columns = [{ width: 120 }];
  orientacoes.addRow(["Orientações de preenchimento — Eixo 3 (atestados e afastamentos CID-F)"]).font = { bold: true };
  orientacoes.addRow([]);
  for (const o of ORIENTACOES_EIXO3) orientacoes.addRow([`• ${o}`]).alignment = { wrapText: true };
  orientacoes.addRow([]);
  orientacoes.addRow(["Exemplo de linha (não copie para a aba Ocorrências):"]).font = { bold: true };
  orientacoes.addRow([
    "Produção | F43.2 | Transtornos de adaptação | 15/03/2025 | 10 | Sim | Relato de sobrecarga por metas",
  ]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
