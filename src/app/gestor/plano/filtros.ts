import type { AcaoCompleta } from "@/lib/plano-acao";
import { situacaoDaAcao } from "@/lib/plano-acao-util";

export type Filtros = { setor?: string; fator?: string; fase?: string; situacao?: string; prioridade?: string; q?: string; visao?: string };

/** Mesmos filtros na tela e na exportação. */
export function filtrar(acoes: AcaoCompleta[], f: Filtros, hoje: string) {
  const q = (f.q ?? "").trim().toLocaleLowerCase("pt-BR");
  return acoes.filter((a) => {
    if (f.setor && !a.setores.some((s) => s.setorId === f.setor)) return false;
    if (f.fator && a.dimensaoId !== f.fator) return false;
    if (f.fase && a.fase !== f.fase) return false;
    if (f.prioridade && a.prioridade !== f.prioridade) return false;
    if (f.situacao && situacaoDaAcao(a, hoje) !== f.situacao) return false;
    if (q && !`${a.oque} ${a.responsavel ?? ""} ${a.como ?? ""}`.toLocaleLowerCase("pt-BR").includes(q)) return false;
    return true;
  });
}

