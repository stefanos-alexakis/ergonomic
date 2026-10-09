import type { ReactNode } from "react";
import type { ItemNav } from "./nav-gestor";

/** Ícones de traço (16×16) dos botões do menu. SVG inline, sem dependência. */
const CAMINHOS: Record<NonNullable<ItemNav["icone"]>, ReactNode> = {
  // prancheta com linhas
  pesquisas: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  // organograma
  estrutura: (
    <>
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </>
  ),
  // escudo com check
  eixo2: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3zM9 12l2 2 4-4" />,
  // documento médico
  eixo3: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5M12 11v6M9 14h6" />
    </>
  ),
  // gráfico de barras
  painel: <path d="M4 20h16M7 16v-5M12 16V7M17 16v-8" />,
  // prédio
  empresas: <path d="M4 21V5l8-2v18M12 9h8v12M4 21h16M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2" />,
  // alerta (severidade)
  severidade: <path d="M12 3 2 20h20L12 3zM12 10v4M12 17h0" />,
  // lista de tarefas com check
  plano: <path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />,
  // relógio com seta (prazos)
  prazos: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M9 2h6" />
    </>
  ),
  // pessoas
  perfil: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .8 3 3 3 6" />
    </>
  ),
  // balança
  pesos: <path d="M12 4v16M6 20h12M5 8h14M5 8l-2 6a3 3 0 0 0 4 0L5 8zM19 8l-2 6a3 3 0 0 0 4 0l-2-6z" />,
};

export function IconeNav({ nome }: { nome: ItemNav["icone"] }) {
  if (!nome) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      {CAMINHOS[nome]}
    </svg>
  );
}
