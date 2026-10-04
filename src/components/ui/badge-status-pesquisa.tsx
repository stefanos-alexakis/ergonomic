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
  pesquisa: { dataInicio: Date; dataFim: Date };
  codigosGerados: boolean;
}) {
  const status = statusDaPesquisa(pesquisa, { codigosGerados });
  return <Badge tom={TOM[status]}>{ROTULO_STATUS_PESQUISA[status]}</Badge>;
}
