/**
 * Plano de ação — funções puras (dinheiro, datas, situação, agrupamento).
 * Tudo que dá para testar sem banco mora aqui.
 */

export type Fase = "PLANEJAR" | "EXECUTAR" | "VERIFICAR" | "CONCLUIDA" | "CANCELADA";
export type Eficacia = "EFICAZ" | "PARCIAL" | "INEFICAZ";

export const FASES: Record<Fase, { rotulo: string; letra: string; descricao: string }> = {
  PLANEJAR: { rotulo: "Planejar", letra: "P", descricao: "Ação cadastrada; completar o 5W2H" },
  EXECUTAR: { rotulo: "Executar", letra: "D", descricao: "Em execução" },
  VERIFICAR: { rotulo: "Verificar", letra: "C", descricao: "Aguardando verificação de eficácia" },
  CONCLUIDA: { rotulo: "Agir · concluída", letra: "A", descricao: "Eficácia registrada e decisão tomada" },
  CANCELADA: { rotulo: "Cancelada", letra: "—", descricao: "Ação cancelada" },
};

export const EFICACIAS: Record<Eficacia, { rotulo: string; tom: "sucesso" | "atencao" | "perigo" }> = {
  EFICAZ: { rotulo: "Eficaz", tom: "sucesso" },
  PARCIAL: { rotulo: "Parcialmente eficaz", tom: "atencao" },
  INEFICAZ: { rotulo: "Ineficaz", tom: "perigo" },
};

// ── Dinheiro: sempre em centavos inteiros (sem erro de arredondamento) ──

/** Teto de R$ 100 milhões — evita estouro e erro de digitação absurdo. */
export const CUSTO_MAXIMO_CENTAVOS = 10_000_000_000;

/**
 * "1.234,56" · "1234,5" · "R$ 1.234" · "1234.56" → centavos. Vazio → null.
 * Ponto com 1–2 casas no fim é decimal ("1234.56"); senão, separador de milhar.
 */
export function lerReais(texto: string): { ok: true; centavos: number | null } | { ok: false; erro: string } {
  const t = texto.replace(/R\$|\s/g, "");
  if (t === "") return { ok: true, centavos: null };
  if (!/^\d[\d.,]*$/.test(t)) return { ok: false, erro: "Custo: use só números, por exemplo 1.500,00." };
  let normal: string;
  if (t.includes(",")) normal = t.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{1,2}$/.test(t) && (t.match(/\./g) ?? []).length === 1) normal = t;
  else normal = t.replace(/\./g, "");
  if ((normal.match(/\./g) ?? []).length > 1) return { ok: false, erro: "Custo inválido." };
  const valor = Number(normal);
  if (!Number.isFinite(valor) || valor < 0) return { ok: false, erro: "Custo inválido." };
  const centavos = Math.round(valor * 100);
  if (centavos > CUSTO_MAXIMO_CENTAVOS) return { ok: false, erro: "Custo acima do limite (R$ 100 milhões)." };
  return { ok: true, centavos };
}

export function formatarReais(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "—";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Para preencher o campo do formulário: "1234,56". */
export function reaisParaCampo(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

// ── Datas: só dia, sem hora (coluna @db.Date chega como meia-noite UTC) ──

const FUSO = "America/Sao_Paulo";

/** "2026-10-06" do dia de hoje em São Paulo. */
export function hojeIso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** Dia (meia-noite UTC) a partir de "aaaa-mm-dd"; vazio → null; inválido → undefined. */
export function lerData(texto: string): Date | null | undefined {
  const t = texto.trim();
  if (t === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return undefined;
  const d = new Date(`${t}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t ? undefined : d;
}

export const dataIso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/** "06/10/2026" de uma coluna de data (sem deslocar o dia pelo fuso). */
export function formatarDia(d: Date | null | undefined): string {
  if (!d) return "—";
  const [a, m, dia] = d.toISOString().slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}

/** Dia (meia-noite UTC) de uma data/hora qualquer, no fuso de São Paulo. */
export function diaDe(d: Date): Date {
  return new Date(`${hojeIso(d)}T00:00:00Z`);
}

// ── Situação: calculada, nunca gravada — nunca contradiz a fase ──

export type Situacao = "CONCLUIDA" | "CANCELADA" | "ATRASADA" | "VENCE_EM_BREVE" | "NO_PRAZO" | "SEM_PRAZO";

export const SITUACOES: Record<Situacao, { rotulo: string; tom: "sucesso" | "atencao" | "perigo" | "neutro" }> = {
  CONCLUIDA: { rotulo: "Concluída", tom: "sucesso" },
  CANCELADA: { rotulo: "Cancelada", tom: "neutro" },
  ATRASADA: { rotulo: "Atrasada", tom: "perigo" },
  VENCE_EM_BREVE: { rotulo: "Vence em até 30 dias", tom: "atencao" },
  NO_PRAZO: { rotulo: "No prazo", tom: "sucesso" },
  SEM_PRAZO: { rotulo: "Sem prazo", tom: "neutro" },
};

/**
 * Atraso só existe enquanto a ação está aberta (planejar/executar/verificar).
 * Na verificação, o que vale é a data de reavaliação; antes dela, o prazo.
 */
export function situacaoDaAcao(
  a: { fase: Fase; prazo: Date | null; reavaliarEm: Date | null },
  hoje: string = hojeIso(),
): Situacao {
  if (a.fase === "CONCLUIDA") return "CONCLUIDA";
  if (a.fase === "CANCELADA") return "CANCELADA";
  const limite = a.fase === "VERIFICAR" ? (a.reavaliarEm ?? a.prazo) : a.prazo;
  if (!limite) return "SEM_PRAZO";
  const dia = dataIso(limite);
  if (dia < hoje) return "ATRASADA";
  const em30 = new Date(`${hoje}T00:00:00Z`);
  em30.setUTCDate(em30.getUTCDate() + 30);
  return dia <= dataIso(em30) ? "VENCE_EM_BREVE" : "NO_PRAZO";
}

// ── Geração a partir do Eixo 2 ──

/** Texto comparável: sem espaços sobrando e sem diferença de maiúsculas. */
export function normalizarTexto(t: string): string {
  return t.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

export type PlanoEixo2 = { questaoId: string; setorId: string; planoAcao: string };
export type GrupoPlano = { questaoId: string; texto: string; chave: string; setores: string[] };

/**
 * "Responder para todos" grava o mesmo plano em cada setor: agrupa por
 * questão + texto para virar UMA ação com vários setores (não uma por setor).
 */
export function agruparPlanosEixo2(planos: PlanoEixo2[]): GrupoPlano[] {
  const grupos = new Map<string, GrupoPlano>();
  for (const p of planos) {
    const texto = p.planoAcao.trim();
    if (!texto) continue;
    const chave = `${p.questaoId}|${normalizarTexto(texto)}`;
    const g = grupos.get(chave) ?? { questaoId: p.questaoId, texto, chave, setores: [] };
    if (!g.setores.includes(p.setorId)) g.setores.push(p.setorId);
    grupos.set(chave, g);
  }
  return [...grupos.values()];
}

// ── Exportação ──

/** Planilha: texto começando com = + - @ (ou tab/CR) viraria fórmula ao abrir — prefixa com apóstrofo. */
export function seguroParaPlanilha(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

// ── Limites dos campos ──

export const LIMITES = {
  oque: 500,
  textoLongo: 2000,
  responsavel: 120,
  cargo: 120,
  nota: 2000,
} as const;
