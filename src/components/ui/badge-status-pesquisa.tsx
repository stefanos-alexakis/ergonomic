import { ROTULO_STATUS_PESQUISA, statusDaPesquisa, type StatusPesquisa } from "@/lib/vigencia-pesquisa";
import { Badge } from "./badge";

const TOM: Record<StatusPesquisa, "neutro" | "sucesso" | "atencao"> = {
  RASCUNHO: "neutro",
  AGENDADA: "atencao",
  ABERTA: "sucesso",
  ENCERRADA: "neutro",
};

/** Selo do status da pesquisa, calculado pelas datas no momento da exibição. */
export function BadgeStatusPesquisa({
  pesquisa,
  codigosGerados,
}: {
  pesquisa: { dataInicio: Date; dataFim: Date; arquivadaEm?: Date | null; exclusaoSolicitadaEm?: Date | null };
  codigosGerados: boolean;
}) {
  if (pesquisa.arquivadaEm) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <Badge tom="neutro">Arquivada</Badge>
        {pesquisa.exclusaoSolicitadaEm && <Badge tom="atencao">Exclusão solicitada</Badge>}
      </span>
    );
  }
  const status = statusDaPesquisa(pesquisa, { codigosGerados });
  return <Badge tom={TOM[status]}>{ROTULO_STATUS_PESQUISA[status]}</Badge>;
}
