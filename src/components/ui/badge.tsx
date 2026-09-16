import { cn } from "@/lib/cn";

type Tom = "neutro" | "sucesso" | "atencao" | "perigo";

const TONS: Record<Tom, string> = {
  neutro: "bg-zinc-100 text-zinc-700",
  sucesso: "bg-emerald-50 text-emerald-700",
  atencao: "bg-amber-50 text-amber-700",
  perigo: "bg-red-50 text-red-700",
};

/** Mapeia os enums de status do domínio para o tom certo, num só lugar. */
const TOM_POR_STATUS: Record<string, Tom> = {
  RASCUNHO: "neutro",
  AGENDADA: "atencao",
  ABERTA: "sucesso",
  ENCERRADA: "neutro",
  DISPONIVEL: "neutro",
  INICIADO: "atencao",
  CONCLUIDO: "sucesso",
  EXPIRADO: "perigo",
  BLOQUEADO: "perigo",
  PARTICIPANTE: "neutro",
  TESTE: "atencao",
};

export function Badge({ children, tom }: { children: string; tom?: Tom }) {
  const tomResolvido = tom ?? TOM_POR_STATUS[children] ?? "neutro";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONS[tomResolvido],
      )}
    >
      {children}
    </span>
  );
}
