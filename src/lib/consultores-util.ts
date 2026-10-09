import { semCrlf } from "@/lib/plano-acao-util";

/** Consultores — parte pura (vale no navegador e no servidor). */

export const LIMITES_CONSULTOR = { nome: 120, formacao: 160, registro: 80, cargo: 120, email: 160 } as const;

export type DadosConsultor = { nome: string; formacao: string | null; registro: string | null; cargo: string | null; email: string | null };

/** Lê e valida o formulário. Só o nome é obrigatório. */
export function lerConsultor(fd: FormData): { ok: true; dados: DadosConsultor } | { ok: false; erro: string } {
  const campo = (k: keyof typeof LIMITES_CONSULTOR) => semCrlf(String(fd.get(k) ?? "")).replace(/\s+/g, " ");
  const nome = campo("nome");
  if (nome.length < 2) return { ok: false, erro: "Informe o nome do consultor." };
  for (const k of Object.keys(LIMITES_CONSULTOR) as (keyof typeof LIMITES_CONSULTOR)[]) {
    if (campo(k).length > LIMITES_CONSULTOR[k]) return { ok: false, erro: `Campo muito longo: ${k} (máx. ${LIMITES_CONSULTOR[k]}).` };
  }
  const email = campo("email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
  const opc = (v: string) => v || null;
  return {
    ok: true,
    dados: { nome, formacao: opc(campo("formacao")), registro: opc(campo("registro")), cargo: opc(campo("cargo")), email: opc(email) },
  };
}

