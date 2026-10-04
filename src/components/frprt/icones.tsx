import type { ReactNode } from "react";

/**
 * Ícones simples (traço, 24×24) para os 13 fatores de risco — como os da
 * imagem de referência do painel. SVG inline: sem dependência nova e
 * renderiza no servidor.
 */

function Svg({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const PORFATOR: Record<number, ReactNode> = {
  // 1. Instrução de trabalho — prancheta
  1: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  // 2. Demandas — pilha
  2: <path d="M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5" />,
  // 3. Controle e autonomia — controles deslizantes
  3: <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />,
  // 4. Ritmo e cadência — velocímetro
  4: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="m12 18 4-6" />
    </>
  ),
  // 5. Horários e jornada — relógio
  5: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  // 6. Segurança no emprego — escudo
  6: <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3zM9 12l2 2 4-4" />,
  // 7. Gestão de mudanças — setas circulares
  7: <path d="M20 12a8 8 0 0 1-14 5M4 12a8 8 0 0 1 14-5M18 3v4h-4M6 21v-4h4" />,
  // 8. Relações interpessoais — pessoas
  8: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c2.8 0 5 2.2 5 5" />
    </>
  ),
  // 9. Liderança — megafone
  9: <path d="M3 10v4h3l7 4V6L6 10H3zM17 9a4 4 0 0 1 0 6M6 14l1 5h2" />,
  // 10. Equilíbrio trabalho-vida — balança
  10: <path d="M12 4v16M6 20h12M5 8h14M5 8l-2 6a3 3 0 0 0 4 0L5 8zM19 8l-2 6a3 3 0 0 0 4 0l-2-6z" />,
  // 11. Violência — alerta
  11: <path d="M12 3 2 20h20L12 3zM12 10v4M12 17h0" />,
  // 12. Situações extremas — raio
  12: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />,
  // 13. Trabalho isolado — pessoa sozinha
  13: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21c0-3.3 2.7-6 6-6s6 2.7 6 6M3 3l18 18" />
    </>
  ),
};

/** Ícone pelo número do fator ("5. Horários e Jornada" → 5). */
export function IconeFator({ nome, className }: { nome: string; className?: string }) {
  const numero = Number.parseInt(nome, 10);
  return <Svg className={className}>{PORFATOR[numero] ?? <circle cx="12" cy="12" r="8" />}</Svg>;
}

export function IconeEmpresa({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 21V5l8-2v18M12 9h8v12M4 21h16M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2" />
    </Svg>
  );
}

export function IconeCalendario({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}
