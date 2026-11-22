/**
 * Eixo 3 — CIDs do capítulo Z (proposta "Inclusão dos CIDs Z no Eixo 3").
 * Funções puras, sem banco.
 *
 * Três grupos:
 *  - A: agrava fatores (×1,10 e FMEA), como os CIDs F, quando a relação é "Sim";
 *  - B: reconhecido e contado nos indicadores, mas não agrava nenhum fator;
 *  - C: fora do escopo psicossocial (agentes físicos/ambientais) — a plataforma
 *       avisa para tratar no PGR de riscos físicos.
 *
 * Os fatores seguem a ordem (1–13) das dimensões do questionário.
 * Código Z que não está na tabela é aceito, mas fica "sem correspondência".
 */

export type GrupoCid = "A" | "B" | "C";
export type TipoAlerta = "SUBSTANCIAS" | "AUTOLESAO" | "AGENTE_FISICO";

export type CidZ = {
  cid: string;
  descricao: string;
  grupo: GrupoCid;
  /** Ordem (1–13) dos fatores que o código agrava — só no grupo A. */
  fatores: number[];
  alerta?: TipoAlerta;
  /** Dado especialmente sensível (LGPD): a lista individual não mostra a linha. */
  sensivel?: boolean;
};

const A = (cid: string, descricao: string, fatores: number[], sensivel = false): CidZ => ({
  cid,
  descricao,
  grupo: "A",
  fatores,
  ...(sensivel ? { sensivel } : {}),
});
const B = (cid: string, descricao: string, extra: Partial<CidZ> = {}): CidZ => ({
  cid,
  descricao,
  grupo: "B",
  fatores: [],
  ...extra,
});
const C = (cid: string, descricao: string): CidZ => ({
  cid,
  descricao,
  grupo: "C",
  fatores: [],
  alerta: "AGENTE_FISICO",
});
const SUBST = { alerta: "SUBSTANCIAS", sensivel: true } as const;

export const CIDS_Z: CidZ[] = [
  B("Z00.4", "Exame psiquiátrico geral não classificado em outra parte"),
  B("Z03.2", "Observação por suspeita de transtornos mentais e do comportamento"),
  B("Z04.0", "Teste para álcool e para drogas no sangue", SUBST),
  A("Z04.4", "Exame e observação após alegação de estupro e sedução", [11], true),
  B("Z04.6", "Exame psiquiátrico geral, requerido por autoridade"),
  B("Z13.3", "Exame especial de rastreamento de transtornos mentais e do comportamento"),
  B("Z50.3", "Reabilitação de dependente de drogas", SUBST),
  A("Z56.0", "Desemprego não especificado", [6]),
  A("Z56.1", "Mudança de emprego", [6, 7]),
  A("Z56.2", "Ameaça de perda de emprego", [6]),
  A("Z56.3", "Ritmo de trabalho penoso", [4, 2]),
  A("Z56.4", "Desacordo com patrão e colegas de trabalho", [8, 9]),
  A("Z56.5", "Má adaptação ao trabalho", [1, 7]),
  B("Z56.7", "Outros problemas e os não especificados relacionados com o emprego"),
  C("Z57.0", "Exposição ocupacional ao ruído"),
  C("Z57.7", "Exposição ocupacional à vibração"),
  C("Z57.8", "Exposição ocupacional a outros fatores de risco"),
  C("Z57.9", "Exposição ocupacional a fator de risco não especificado"),
  C("Z58.0", "Exposição ao ruído"),
  C("Z58.7", "Exposição à fumaça de tabaco"),
  A("Z60.5", "Problemas relacionados com discriminação e perseguição", [11, 8]),
  B("Z65.8", "Outros problemas especificados relacionados com circunstâncias psicossociais"),
  B("Z65.9", "Problemas relacionados com circunstâncias psicossociais não especificadas"),
  B("Z71.4", "Aconselhamento e supervisão para abuso de álcool", SUBST),
  B("Z71.5", "Aconselhamento e supervisão para abuso de drogas", SUBST),
  B("Z71.6", "Aconselhamento para o abuso de fumo", SUBST),
  B("Z72.0", "Uso do tabaco", SUBST),
  B("Z72.1", "Uso de álcool", SUBST),
  B("Z72.2", "Uso de droga", SUBST),
  B("Z72.5", "Comportamento sexual de alto risco"),
  B("Z72.6", "Mania de jogo e apostas"),
  A("Z73.0", "Esgotamento", [2, 4, 5, 10]),
  B("Z73.1", "Acentuação de traços de personalidade"),
  A("Z73.3", "“Stress” não classificado em outra parte", [2, 3, 4, 9]),
  B("Z86.5", "História pessoal de outros transtornos mentais e comportamentais"),
  B("Z91.5", "História pessoal de lesão autoprovocada intencionalmente", { alerta: "AUTOLESAO", sensivel: true }),
];

const PORCODIGO = new Map(CIDS_Z.map((c) => [c.cid, c]));

export function infoCidZ(cid: string): CidZ | undefined {
  return PORCODIGO.get(cid);
}

/** Capítulo do CID já normalizado: "F" ou "Z". */
export function capituloDoCid(cid: string): "F" | "Z" {
  return cid.startsWith("Z") ? "Z" : "F";
}

/**
 * Número do fator (1–13) a partir do nome da dimensão ("5. Horários e Jornada" → 5).
 * Não usar `Dimensao.ordem`: ela reinicia a cada bloco do questionário.
 */
export function numeroDoFator(nomeDimensao: string): number {
  const n = Number.parseInt(nomeDimensao, 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Códigos Z do grupo A que agravam o fator de ordem `ordem` (1–13). */
export function cidsZQueAgravam(ordem: number): string[] {
  return CIDS_Z.filter((c) => c.grupo === "A" && c.fatores.includes(ordem)).map((c) => c.cid);
}

/** Z reconhecido que, por regra, não agrava (grupos B e C): não é "sem correspondência". */
export function ehZReconhecidoSemAgravo(cid: string): boolean {
  const i = PORCODIGO.get(cid);
  return !!i && i.grupo !== "A";
}

export function alertaDoCid(cid: string): TipoAlerta | null {
  return PORCODIGO.get(cid)?.alerta ?? null;
}

export function ehCidSensivel(cid: string): boolean {
  return !!PORCODIGO.get(cid)?.sensivel;
}

export const ROTULO_GRUPO: Record<GrupoCid, string> = {
  A: "Agrava fatores",
  B: "Indicador (não agrava)",
  C: "Fora do escopo psicossocial",
};

export const TEXTO_ALERTA: Record<TipoAlerta, string> = {
  SUBSTANCIAS: "Uso de substâncias: indicador próprio; não agrava fator. Tratar com o programa de saúde da empresa.",
  AUTOLESAO: "Histórico de lesão autoprovocada: atenção especial — encaminhar ao serviço de saúde ocupacional.",
  AGENTE_FISICO: "Agente físico/ambiental: fora do FRPRT — tratar no PGR de riscos físicos.",
};
