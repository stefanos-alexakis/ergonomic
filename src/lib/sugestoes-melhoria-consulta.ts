import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { seguroParaPlanilha } from "@/lib/plano-acao-util";

export type SugestaoItem = { setorId: string | null; setor: string; texto: string };
export type SetorComSugestoes = { id: string; nome: string; total: number };
export type SugestoesPesquisa = {
  /** Sugestões escritas (quem deixou em branco não conta). */
  total: number;
  /** Respostas concluídas da pesquisa — para mostrar "X de Y". */
  respostasConcluidas: number;
  setores: SetorComSugestoes[];
  itens: SugestaoItem[];
};

const SEM_SETOR = "Setor não informado";

/**
 * Sugestões de melhoria (pergunta aberta final do Eixo 1) de uma pesquisa,
 * opcionalmente de um só setor. O gestor vê tudo, por setor (decisão do
 * cliente). Só respostas concluídas de participantes — os códigos de teste
 * ficam de fora, como no restante do painel.
 *
 * A ordem é por setor e depois alfabética pelo texto, de propósito: nada de
 * data/hora nem ordem de chegada, que ajudariam a descobrir quem escreveu.
 * Quem chama já confirmou que a pesquisa é da empresa do gestor.
 */
export async function listarSugestoes(pesquisaId: string, setorId?: string | null): Promise<SugestoesPesquisa> {
  const base = { concluidoEm: { not: null }, codigoAcesso: { pesquisaId, tipo: "PARTICIPANTE" as const } };
  const [respostasConcluidas, rows] = await Promise.all([
    db.resposta.count({ where: base }),
    db.resposta.findMany({
      where: { ...base, sugestaoMelhoria: { not: null } },
      select: { sugestaoMelhoria: true, setor: { select: { id: true, nome: true } } },
    }),
  ]);

  const todos: SugestaoItem[] = rows
    .filter((r) => (r.sugestaoMelhoria ?? "").trim() !== "")
    .map((r) => ({ setorId: r.setor?.id ?? null, setor: r.setor?.nome ?? SEM_SETOR, texto: r.sugestaoMelhoria!.trim() }));

  const porSetor = new Map<string, SetorComSugestoes>();
  for (const i of todos) {
    const chave = i.setorId ?? "";
    const atual = porSetor.get(chave) ?? { id: chave, nome: i.setor, total: 0 };
    atual.total++;
    porSetor.set(chave, atual);
  }
  const setores = [...porSetor.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const itens = todos
    .filter((i) => !setorId || i.setorId === setorId)
    .sort((a, b) => a.setor.localeCompare(b.setor, "pt-BR") || a.texto.localeCompare(b.texto, "pt-BR"));

  return { total: todos.length, respostasConcluidas, setores, itens };
}

/** Planilha com todas as sugestões: Setor e Sugestão, nada que identifique o autor. */
export async function gerarSugestoesExcel(pesquisaId: string, titulo: string): Promise<Buffer | null> {
  const dados = await listarSugestoes(pesquisaId);
  if (dados.total === 0) return null;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sugestões");
  ws.addRow([titulo]).font = { bold: true, size: 13 };
  ws.addRow([]);
  const cab = ws.addRow(["Setor", "Sugestão de melhoria"]);
  cab.font = { bold: true };
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 110;
  for (const i of dados.itens) {
    const linha = ws.addRow([seguroParaPlanilha(i.setor), seguroParaPlanilha(i.texto)]);
    linha.alignment = { vertical: "top", wrapText: true };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
