import { encerrarImpersonacaoAction } from "@/app/admin/actions";

/**
 * Só aparece quando um admin da plataforma está vendo `/gestor/**` como
 * se fosse o gestor da empresa (src/lib/impersonacao.ts) — um admin só
 * chega a essas páginas passando por lá, nunca tem Membership própria de
 * outra forma, então nenhuma checagem extra é necessária aqui além de
 * quem chama decidir renderizar isto ou não.
 */
export function BannerImpersonacao({ workspaceNome }: { workspaceNome: string }) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-900 flex items-center justify-between gap-4">
      <span>
        Você está vendo como <strong>{workspaceNome}</strong> (visão de gestor).
      </span>
      <form action={encerrarImpersonacaoAction}>
        <button type="submit" className="underline hover:no-underline shrink-0 cursor-pointer">
          Sair e voltar para admin
        </button>
      </form>
    </div>
  );
}
