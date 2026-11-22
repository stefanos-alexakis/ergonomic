/**
 * Eixo 3 — ocorrências CID-F por setor (metodologia FRPRT §5 e planilha
 * "Fatores x CID F"). Funções puras: nenhuma consulta a banco aqui.
 *
 * Regra central: uma ocorrência com relação ao trabalho = "Sim" agrava em
 * ×1,10 os fatores de risco do setor cujo conjunto de CIDs (aba 2) é
 * compatível com o CID da ocorrência. Sem gradação por quantidade
 * (metodologia: "não há diferenciação do peso conforme o percentual").
 *
 * Orientações técnicas (aba 3) que viraram regra:
 *  - CID F é possibilidade de agravo, não causa: CID sem correspondência na
 *    matriz não agrava nada ("não forçar um CID F");
 *  - F43.1 não é sinônimo de estresse ocupacional: subcódigo citado
 *    explicitamente na matriz só casa com quem cita aquele subcódigo;
 *  - "Não específico" nunca é alvo de agravamento automático.
 */

import { cidsZQueAgravam, ehZReconhecidoSemAgravo } from "@/lib/cids-z";

export const FATOR_AGRAVAMENTO = 1.1;

/** Texto do modelo do Eixo 3 da cliente ("Declaração de veracidade das informações"). */
export const TEXTO_DECLARACAO =
  "Declaro, como responsável pelo setor de Recursos Humanos / Departamento Pessoal da empresa, que as " +
  "informações aqui registradas são verdadeiras, completas e refletem os registros oficiais de atestados e " +
  "afastamentos do período indicado, e que estou ciente de que este levantamento integra processo de avaliação " +
  "ergonômica e poderá ser utilizado como evidência técnica.";

export type Relacao = "SIM" | "NAO" | "INCONCLUSIVO";

export const ROTULO_RELACAO: Record<Relacao, string> = {
  SIM: "Sim",
  NAO: "Não",
  INCONCLUSIVO: "Inconclusivo",
};

/**
 * "f41.1", "F 41.1", "F411", "F41.1 - Ansiedade" → "F41.1"; "z73.0" → "Z73.0".
 * Aceita os capítulos F e Z; outro capítulo ou formato inválido → null.
 */
export function normalizarCid(bruto: unknown): string | null {
  if (bruto === null || bruto === undefined) return null;
  // Código no início; o que vier depois (descrição colada) é ignorado.
  const m = /^\s*([FZ])\s*(\d{2})\s*\.?\s*(\d)?(?!\d)/.exec(String(bruto).toUpperCase());
  if (!m) return null;
  return m[3] ? `${m[1]}${m[2]}.${m[3]}` : `${m[1]}${m[2]}`;
}

function semAcento(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function normalizarRelacao(bruto: unknown): Relacao | null {
  const v = semAcento(String(bruto ?? ""));
  if (["sim", "s", "yes"].includes(v)) return "SIM";
  if (["nao", "n", "no"].includes(v)) return "NAO";
  if (["inconclusivo", "inconclusiva", "i"].includes(v)) return "INCONCLUSIVO";
  return null;
}

export type MatrizPorFator = Map<string, Set<string>>;

/** Junta os CIDs das situações de cada fator (união da aba 2 por fator). */
export function montarMatrizPorFator(
  situacoes: { fatorId: string; cids: string[]; naoEspecifico: boolean; ordemFator?: number }[],
): MatrizPorFator {
  const matriz: MatrizPorFator = new Map();
  for (const s of situacoes) {
    const conjunto = matriz.get(s.fatorId) ?? new Set<string>();
    if (!s.naoEspecifico) {
      for (const c of s.cids) conjunto.add(c);
      // CIDs Z do grupo A, ligados ao fator (1–13) — mesma regra dos CIDs F.
      if (s.ordemFator !== undefined) for (const c of cidsZQueAgravam(s.ordemFator)) conjunto.add(c);
    }
    matriz.set(s.fatorId, conjunto);
  }
  return matriz;
}

/** Fatores cujo conjunto de CIDs é compatível com o CID da ocorrência. */
export function fatoresCompativeis(cid: string, matriz: MatrizPorFator): string[] {
  const subcodigosCitados = new Set<string>();
  for (const cids of matriz.values()) for (const c of cids) if (c.includes(".")) subcodigosCitados.add(c);

  const resultado: string[] = [];
  for (const [fatorId, cids] of matriz) {
    if (subcodigosCitados.has(cid)) {
      // Subcódigo citado explicitamente (F43.1, F48.0, F48.8, F51.2):
      // só casa com quem cita exatamente ele.
      if (cids.has(cid)) resultado.push(fatorId);
    } else if (cids.has(cid.slice(0, 3))) {
      // Demais: casa pela categoria (F41.1 → F41). Entradas de subcódigo
      // (F48.0) não casam com outros subcódigos da mesma categoria (F48.1).
      resultado.push(fatorId);
    }
  }
  return resultado;
}

/**
 * Matrícula do trabalhador (opcional na planilha): serve para contar
 * colaboradores, não atestados, e para ver a reincidência. Sem espaços a mais
 * e sem diferenciar maiúsculas; zeros à esquerda ficam. Vazio = sem matrícula.
 */
export function normalizarMatricula(bruto: unknown): string | null {
  const t = (typeof bruto === "number" ? String(bruto) : typeof bruto === "string" ? bruto : "")
    .replace(/\s+/g, " ")
    .trim();
  return t === "" ? null : t.slice(0, 40);
}

/**
 * Chave de "quem é a pessoa" de uma ocorrência. Linha sem matrícula conta como
 * uma pessoa diferente (decisão do cliente): usa a posição da linha como chave.
 */
export function chaveColaborador(matricula: string | null | undefined, posicao: number): string {
  const m = normalizarMatricula(matricula);
  return m ? `m:${m.toLocaleUpperCase("pt-BR")}` : `l:${posicao}`;
}

export type ResultadoEixo3Setor = {
  /** fatorId → ×1,10 ou ×1,00 */
  fatorPorFator: Map<string, number>;
  /** fatorId → CIDs que causaram o agravamento */
  cidsPorFator: Map<string, string[]>;
  /** fatorId → maior afastamento (dias) entre as ocorrências relacionadas e compatíveis (FMEA) */
  maiorAfastamentoPorFator: Map<string, number>;
  /** Atestados (linhas da planilha) do setor. */
  ocorrencias: number;
  /** Atestados "Sim". */
  relacionadas: number;
  /** Atestados "Inconclusivo". */
  inconclusivas: number;
  /** Colaboradores com atestado (matrículas distintas; linha sem matrícula = uma pessoa). */
  colaboradoresComAtestado: number;
  /** Colaboradores com pelo menos um atestado "Sim" — só "Sim" agrava. */
  colaboradoresRelacionados: number;
  /** Colaboradores com pelo menos um atestado "Inconclusivo". */
  colaboradoresInconclusivos: number;
  /** Colaboradores com 2 ou mais atestados (reincidência). */
  reincidentes: number;
  diasAfastados: number;
  cidsSemCorrespondencia: string[];
};

/** Fator do Eixo 3 de cada fator de risco, para as ocorrências de UM setor. */
export function calcularEixo3Setor(
  ocorrencias: { cid: string; relacao: Relacao; diasAfastados: number | null; matricula?: string | null }[],
  matriz: MatrizPorFator,
): ResultadoEixo3Setor {
  const cidsPorFator = new Map<string, Set<string>>();
  const maiorAfastamentoPorFator = new Map<string, number>();
  const semCorrespondencia = new Set<string>();
  let relacionadas = 0;
  let inconclusivas = 0;
  let dias = 0;
  const atestadosPorPessoa = new Map<string, number>();
  const pessoasRelacionadas = new Set<string>();
  const pessoasInconclusivas = new Set<string>();

  for (const [i, o] of ocorrencias.entries()) {
    dias += o.diasAfastados ?? 0;
    const pessoa = chaveColaborador(o.matricula, i);
    atestadosPorPessoa.set(pessoa, (atestadosPorPessoa.get(pessoa) ?? 0) + 1);
    if (o.relacao === "SIM") pessoasRelacionadas.add(pessoa);
    if (o.relacao === "INCONCLUSIVO") pessoasInconclusivas.add(pessoa);
    const fatores = fatoresCompativeis(o.cid, matriz);
    // Z dos grupos B e C é reconhecido (indicador/alerta): não é "sem correspondência".
    if (fatores.length === 0 && !ehZReconhecidoSemAgravo(o.cid)) semCorrespondencia.add(o.cid);
    if (o.relacao === "INCONCLUSIVO") inconclusivas++;
    if (o.relacao !== "SIM") continue; // só "Sim" agrava (decisão do usuário)
    relacionadas++;
    for (const f of fatores) {
      cidsPorFator.set(f, (cidsPorFator.get(f) ?? new Set()).add(o.cid));
      maiorAfastamentoPorFator.set(f, Math.max(maiorAfastamentoPorFator.get(f) ?? 0, o.diasAfastados ?? 0));
    }
  }

  const fatorPorFator = new Map<string, number>();
  for (const fatorId of matriz.keys()) fatorPorFator.set(fatorId, cidsPorFator.has(fatorId) ? FATOR_AGRAVAMENTO : 1);

  return {
    fatorPorFator,
    cidsPorFator: new Map([...cidsPorFator].map(([k, v]) => [k, [...v].sort()])),
    maiorAfastamentoPorFator,
    ocorrencias: ocorrencias.length,
    relacionadas,
    inconclusivas,
    colaboradoresComAtestado: atestadosPorPessoa.size,
    colaboradoresRelacionados: pessoasRelacionadas.size,
    colaboradoresInconclusivos: pessoasInconclusivas.size,
    reincidentes: [...atestadosPorPessoa.values()].filter((n) => n >= 2).length,
    diasAfastados: dias,
    cidsSemCorrespondencia: [...semCorrespondencia].sort(),
  };
}
