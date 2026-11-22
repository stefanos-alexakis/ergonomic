export type ItemNav = {
  href: string;
  label: string;
  /** Ícone do botão (src/components/shell/icones-nav.tsx). */
  icone?: "pesquisas" | "estrutura" | "eixo2" | "eixo3" | "painel" | "empresas" | "pesos" | "severidade" | "plano" | "prazos" | "perfil" | "consultores" | "textos";
  /** Outros prefixos de rota em que o botão aparece como ativo. */
  ativoEm?: string[];
};

/** Botões sempre visíveis na faixa do topo da área do gestor: só os três eixos. */
export const NAV_GESTOR: ItemNav[] = [
  { href: "/gestor", label: "Eixo 1 · Pesquisa com os colaboradores", icone: "pesquisas", ativoEm: ["/gestor/pesquisas"] },
  { href: "/gestor/eixo2", label: "Eixo 2 · Medidas de controle", icone: "eixo2" },
  { href: "/gestor/eixo3", label: "Eixo 3 · Atestados CID", icone: "eixo3" },
];

export type GrupoNav = { titulo: string; itens: ItemNav[] };

/** Menu lateral (gaveta) da área do gestor, por categoria. */
export const GRUPOS_GESTOR: GrupoNav[] = [
  { titulo: "Cadastro", itens: [{ href: "/gestor/estrutura", label: "Setores e departamentos", icone: "estrutura" }] },
  {
    titulo: "Relatórios",
    itens: [
      { href: "/gestor/relatorios-eixo1", label: "Relatórios Eixo 1", icone: "painel" },
      { href: "/gestor/relatorios-eixo2", label: "Relatórios Eixo 2", icone: "painel" },
      { href: "/gestor/painel", label: "Painel FRPRT", icone: "painel" },
    ],
  },
  { titulo: "Gestão", itens: [{ href: "/gestor/plano", label: "Plano de ação", icone: "plano" }] },
];

/** Menu da área do admin da plataforma. */
export const NAV_ADMIN: ItemNav[] = [
  { href: "/admin", label: "Empresas", icone: "empresas", ativoEm: ["/admin/empresas"] },
  { href: "/admin/perguntas", label: "Pesos das perguntas", icone: "pesos" },
  { href: "/admin/severidade", label: "Severidade dos fatores (FMEA)", icone: "severidade" },
  { href: "/admin/prazos", label: "Prazos padrão", icone: "prazos" },
  { href: "/admin/pre-pesquisa", label: "Pré-pesquisa (cruzamentos)", icone: "perfil" },
  { href: "/admin/consultores", label: "Consultores", icone: "consultores" },
  { href: "/admin/textos", label: "Textos do relatório", icone: "textos" },
];

/** O botão está ativo na própria rota, nas filhas dela e nas de `ativoEm`. */
export function itemAtivo(item: ItemNav, pathname: string, raiz: string): boolean {
  const casa = (prefixo: string) => pathname === prefixo || pathname.startsWith(`${prefixo}/`);
  // A raiz da área (/gestor, /admin) só casa exatamente — senão todo botão
  // ficaria ativo junto com o dela.
  if (item.href === raiz ? pathname === raiz : casa(item.href)) return true;
  return (item.ativoEm ?? []).some(casa);
}
