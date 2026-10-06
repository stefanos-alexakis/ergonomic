export type ItemNav = {
  href: string;
  label: string;
  /** Ícone do botão (src/components/shell/icones-nav.tsx). */
  icone?: "pesquisas" | "estrutura" | "eixo2" | "eixo3" | "painel" | "empresas" | "pesos" | "severidade";
  /** Outros prefixos de rota em que o botão aparece como ativo. */
  ativoEm?: string[];
};

/** Menu da área do gestor — um lugar só, em vez de uma cópia por página. */
export const NAV_GESTOR: ItemNav[] = [
  { href: "/gestor", label: "Pesquisas", icone: "pesquisas", ativoEm: ["/gestor/pesquisas"] },
  { href: "/gestor/estrutura", label: "Setores e departamentos", icone: "estrutura" },
  { href: "/gestor/eixo2", label: "Eixo 2 · Medidas de controle", icone: "eixo2" },
  { href: "/gestor/eixo3", label: "Eixo 3 · Atestados CID-F", icone: "eixo3" },
  { href: "/gestor/painel", label: "Painel FRPRT", icone: "painel" },
];

/** Menu da área do admin da plataforma. */
export const NAV_ADMIN: ItemNav[] = [
  { href: "/admin", label: "Empresas", icone: "empresas", ativoEm: ["/admin/empresas"] },
  { href: "/admin/perguntas", label: "Pesos das perguntas", icone: "pesos" },
  { href: "/admin/severidade", label: "Severidade dos fatores (FMEA)", icone: "severidade" },
];

/** O botão está ativo na própria rota, nas filhas dela e nas de `ativoEm`. */
export function itemAtivo(item: ItemNav, pathname: string, raiz: string): boolean {
  const casa = (prefixo: string) => pathname === prefixo || pathname.startsWith(`${prefixo}/`);
  // A raiz da área (/gestor, /admin) só casa exatamente — senão todo botão
  // ficaria ativo junto com o dela.
  if (item.href === raiz ? pathname === raiz : casa(item.href)) return true;
  return (item.ativoEm ?? []).some(casa);
}
