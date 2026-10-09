import { calcularPainelEixo3 } from "@/lib/levantamento-eixo3";
import { ROTULO_RELACAO, type Relacao } from "@/lib/eixo3";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";

const data = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—");
const LIMITE_LISTA = 300;

function Kpi({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-zinc-900 tabular-nums">{valor}</div>
      <div className="text-sm text-zinc-500">{rotulo}</div>
    </div>
  );
}

/** Indicadores do levantamento, agravamento por setor × fator e lista das ocorrências. */
export async function PainelEixo3({
  levantamentoId,
  workspaceId,
  filtroSetor,
  filtroRelacao,
  caminhoBase,
}: {
  levantamentoId: string;
  workspaceId: string;
  filtroSetor?: string;
  filtroRelacao?: string;
  caminhoBase: string;
}) {
  const { fatores, setores, cidsFrequentes, ocorrencias } = await calcularPainelEixo3(levantamentoId, workspaceId);

  const total = setores.reduce((a, s) => a + s.ocorrencias, 0);
  const relacionadas = setores.reduce((a, s) => a + s.relacionadas, 0);
  const inconclusivas = setores.reduce((a, s) => a + s.inconclusivas, 0);
  const dias = setores.reduce((a, s) => a + s.diasAfastados, 0);
  const semCorrespondencia = [...new Set(setores.flatMap((s) => s.cidsSemCorrespondencia))];
  const comF431 = ocorrencias.filter((o) => o.cid === "F43.1").length;

  const filtradas = ocorrencias.filter(
    (o) => (!filtroSetor || o.setorId === filtroSetor) && (!filtroRelacao || o.relacao === filtroRelacao),
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap gap-10">
        <Kpi valor={total} rotulo="ocorrências CID-F" />
        <Kpi valor={relacionadas} rotulo="relacionadas ao trabalho" />
        <Kpi valor={inconclusivas} rotulo="inconclusivas" />
        <Kpi valor={dias} rotulo="dias de afastamento" />
      </div>

      {(inconclusivas > 0 || comF431 > 0 || semCorrespondencia.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Pontos de atenção</h2>
          {inconclusivas > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {inconclusivas} ocorrência(s) com relação <strong>inconclusiva</strong> — não agravam o score, mas devem
              ser investigadas.
            </p>
          )}
          {comF431 > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {comF431} ocorrência(s) <strong>F43.1</strong>: considerar somente com exposição a evento traumático
              compatível e avaliação clínica — não é sinônimo de estresse ocupacional.
            </p>
          )}
          {semCorrespondencia.length > 0 && (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              CID(s) sem correspondência na matriz Fatores × CID F: <strong>{semCorrespondencia.join(", ")}</strong>.
              Entram nos indicadores, mas não agravam nenhum fator (a matriz não força um CID F).
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Por setor</h2>
        <Table>
          <Thead>
            <Tr>
              <Th>Setor</Th>
              <Th>Colaboradores</Th>
              <Th>Ocorrências</Th>
              <Th>Relacionadas</Th>
              <Th>Inconclusivas</Th>
              <Th>Dias</Th>
              <Th>
                <span title="Ocorrências do setor ÷ nº de colaboradores × 100. Conta ocorrências, não pessoas: a planilha não identifica o trabalhador, então quem tem mais de um atestado conta mais de uma vez.">
                  Ocorrência / Colab (%)
                </span>
              </Th>
              <Th>Fatores agravados</Th>
            </Tr>
          </Thead>
          <tbody>
            {setores.map((s) => {
              const agravados = [...s.fatorPorFator.values()].filter((f) => f > 1).length;
              return (
                <Tr key={s.chave}>
                  <Td className="font-medium text-zinc-900">{s.nome}</Td>
                  <Td className="tabular-nums">{s.colaboradores ?? "—"}</Td>
                  <Td className="tabular-nums">{s.ocorrencias}</Td>
                  <Td className="tabular-nums">{s.relacionadas}</Td>
                  <Td className="tabular-nums">{s.inconclusivas}</Td>
                  <Td className="tabular-nums">{s.diasAfastados}</Td>
                  <Td className="tabular-nums">{s.taxaPor100 !== null ? `${s.taxaPor100.toFixed(1).replace(".", ",")}%` : "—"}</Td>
                  <Td>{agravados > 0 ? <Badge tom="perigo">{`${agravados} de ${fatores.length}`}</Badge> : <Badge>Nenhum</Badge>}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        {setores.some((s) => s.colaboradores === null) && (
          <p className="text-xs text-zinc-500 mt-2">
            Para a coluna Ocorrência / Colab (%), informe o nº de colaboradores em Setores e departamentos.
          </p>
        )}
      </section>

      {setores.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">Agravamento por fator de risco (×1,10)</h2>
          <p className="text-xs text-zinc-500 mb-2">
            Só ocorrências <strong>relacionadas ao trabalho</strong> agravam, e só os fatores compatíveis com o CID
            (matriz Fatores × CID F). Passe o mouse para ver o CID.
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="sticky left-0 bg-zinc-50 px-3 py-2 text-left font-medium">Fator</th>
                  {setores.map((s) => (
                    <th key={s.chave} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                      {s.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fatores.map((f) => (
                  <tr key={f.id} className="border-t border-zinc-100">
                    <td className="sticky left-0 bg-white px-3 py-2 text-zinc-700" title={f.fatorRisco}>
                      {f.nome}
                    </td>
                    {setores.map((s) => {
                      const cids = s.cidsPorFator.get(f.id);
                      return (
                        <td key={s.chave} className="px-3 py-2 text-center">
                          {cids ? (
                            <span
                              className="inline-block rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-800 tabular-nums"
                              title={`Relacionado ao trabalho: ${cids.join(", ")}`}
                            >
                              ×1,10
                            </span>
                          ) : (
                            <span className="text-zinc-300">×1,00</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {cidsFrequentes.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-2">CIDs mais frequentes (por categoria)</h2>
          <div className="flex flex-wrap gap-2">
            {cidsFrequentes.map((c) => (
              <span key={c.cid} className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700">
                <strong>{c.cid}</strong> · {c.total}
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Ocorrências ({filtradas.length})</h2>
        <form method="get" action={caminhoBase} className="flex flex-wrap items-end gap-3 mb-3">
          <Select name="setor" defaultValue={filtroSetor ?? ""} className="w-56" aria-label="Filtrar por setor">
            <option value="">Todos os setores</option>
            {setores
              .filter((s) => s.setorId)
              .map((s) => (
                <option key={s.chave} value={s.setorId!}>
                  {s.nome}
                </option>
              ))}
          </Select>
          <Select name="relacao" defaultValue={filtroRelacao ?? ""} className="w-48" aria-label="Filtrar por relação">
            <option value="">Qualquer relação</option>
            {(["SIM", "NAO", "INCONCLUSIVO"] as Relacao[]).map((r) => (
              <option key={r} value={r}>
                {ROTULO_RELACAO[r]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
        <Table>
          <Thead>
            <Tr>
              <Th>Setor</Th>
              <Th>CID-F</Th>
              <Th>Início</Th>
              <Th>Dias</Th>
              <Th>Relação</Th>
              <Th>Justificativa</Th>
            </Tr>
          </Thead>
          <tbody>
            {filtradas.slice(0, LIMITE_LISTA).map((o) => (
              <Tr key={o.id}>
                <Td>{o.setor}</Td>
                <Td>
                  <span className="font-medium">{o.cid}</span>
                  {o.cidDescricao && <div className="text-xs text-zinc-500">{o.cidDescricao}</div>}
                </Td>
                <Td className="tabular-nums">{data(o.dataInicio)}</Td>
                <Td className="tabular-nums">{o.diasAfastados ?? "—"}</Td>
                <Td>
                  <Badge tom={o.relacao === "SIM" ? "perigo" : o.relacao === "INCONCLUSIVO" ? "atencao" : "neutro"}>
                    {ROTULO_RELACAO[o.relacao]}
                  </Badge>
                </Td>
                <Td className="text-zinc-600 max-w-xs">{o.justificativa ?? ""}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {filtradas.length > LIMITE_LISTA && (
          <p className="text-xs text-zinc-500 mt-2">Mostrando {LIMITE_LISTA} de {filtradas.length} — use os filtros.</p>
        )}
      </section>
    </div>
  );
}
