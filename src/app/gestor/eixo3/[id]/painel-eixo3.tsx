import { calcularPainelEixo3 } from "@/lib/levantamento-eixo3";
import { ROTULO_RELACAO, chaveColaborador, type Relacao } from "@/lib/eixo3";
import { TEXTO_ALERTA, alertaDoCid, capituloDoCid, ehCidSensivel, type TipoAlerta } from "@/lib/cids-z";
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
  const { fatores, setores, cidsFrequentes, ocorrencias } = await calcularPainelEixo3(levantamentoId, workspaceId, {
    // A matrícula só existe nesta tela (decisão do cliente): relatórios nunca a recebem.
    incluirMatricula: true,
  });

  const total = setores.reduce((a, s) => a + s.ocorrencias, 0);
  const relacionadas = setores.reduce((a, s) => a + s.relacionadas, 0);
  const inconclusivas = setores.reduce((a, s) => a + s.inconclusivas, 0);
  const colaboradores = setores.reduce((a, s) => a + s.colaboradoresComAtestado, 0);
  const colabRelacionados = setores.reduce((a, s) => a + s.colaboradoresRelacionados, 0);
  const colabInconclusivos = setores.reduce((a, s) => a + s.colaboradoresInconclusivos, 0);
  const reincidentes = setores.reduce((a, s) => a + s.reincidentes, 0);
  const dias = setores.reduce((a, s) => a + s.diasAfastados, 0);
  const semMatricula = ocorrencias.filter((o) => !o.matricula).length;

  // CID F × CID Z: contagem por capítulo (colaborador = matrícula dentro do setor, como no restante).
  const porCapitulo = { F: { atestados: 0, pessoas: new Set<string>() }, Z: { atestados: 0, pessoas: new Set<string>() } };
  const alertas = new Map<TipoAlerta, number>();
  for (const [i, o] of ocorrencias.entries()) {
    const cap = porCapitulo[capituloDoCid(o.cid)];
    cap.atestados++;
    cap.pessoas.add(`${o.setorId ?? o.setor}|${chaveColaborador(o.matricula, i)}`);
    const alerta = alertaDoCid(o.cid);
    if (alerta) alertas.set(alerta, (alertas.get(alerta) ?? 0) + 1);
  }
  // LGPD: CIDs Z especialmente sensíveis entram só nos números agregados, nunca na lista individual.
  const ocultas = ocorrencias.filter((o) => ehCidSensivel(o.cid)).length;

  // Reincidência: mesma matrícula com 2 ou mais atestados (por setor, como na contagem).
  const porPessoa = new Map<string, { matricula: string; setor: string; setorId: string | null; itens: typeof ocorrencias }>();
  for (const [i, o] of ocorrencias.entries()) {
    if (!o.matricula) continue;
    const chave = `${o.setorId ?? o.setor}|${chaveColaborador(o.matricula, i)}`;
    const atual = porPessoa.get(chave) ?? { matricula: o.matricula, setor: o.setor, setorId: o.setorId, itens: [] };
    atual.itens.push(o);
    porPessoa.set(chave, atual);
  }
  const reincidencias = [...porPessoa.values()]
    .map((p) => ({ ...p, itens: p.itens.filter((o) => !ehCidSensivel(o.cid)) }))
    .filter((p) => p.itens.length >= 2)
    .sort((a, b) => b.itens.length - a.itens.length || a.setor.localeCompare(b.setor, "pt-BR"));
  const semCorrespondencia = [...new Set(setores.flatMap((s) => s.cidsSemCorrespondencia))];
  const comF431 = ocorrencias.filter((o) => o.cid === "F43.1").length;

  const filtradas = ocorrencias.filter(
    (o) => !ehCidSensivel(o.cid) && (!filtroSetor || o.setorId === filtroSetor) && (!filtroRelacao || o.relacao === filtroRelacao),
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap gap-10">
        <Kpi valor={colaboradores} rotulo="colaboradores com atestado (CID F e Z)" />
        <Kpi valor={colabRelacionados} rotulo="com atestado relacionado ao trabalho" />
        <Kpi valor={reincidentes} rotulo="com reincidência (2+ atestados)" />
        <Kpi valor={total} rotulo="atestados (CID F e Z)" />
        <Kpi valor={dias} rotulo="dias de afastamento" />
      </div>
      <p className="-mt-6 text-xs text-zinc-500 max-w-3xl">
        Os indicadores contam <strong>colaboradores</strong> (a mesma matrícula conta uma vez por setor); o total de
        atestados aparece ao lado.
        {semMatricula > 0 &&
          ` ${semMatricula} atestado(s) sem matrícula: cada um conta como um colaborador diferente.`}
      </p>
      {porCapitulo.Z.atestados > 0 && (
        <p data-testid="resumo-capitulos" className="-mt-6 text-sm text-zinc-700">
          <strong>CID F:</strong> {porCapitulo.F.atestados} atestado(s) · {porCapitulo.F.pessoas.size} colaborador(es) &nbsp;|&nbsp;{" "}
          <strong>CID Z:</strong> {porCapitulo.Z.atestados} atestado(s) · {porCapitulo.Z.pessoas.size} colaborador(es)
        </p>
      )}

      {(inconclusivas > 0 || comF431 > 0 || semCorrespondencia.length > 0 || alertas.size > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Pontos de atenção</h2>
          {inconclusivas > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {inconclusivas} atestado(s) ({colabInconclusivos} colaborador(es)) com relação <strong>inconclusiva</strong> —
              não agravam o score, mas devem ser investigados.
            </p>
          )}
          {comF431 > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {comF431} ocorrência(s) <strong>F43.1</strong>: considerar somente com exposição a evento traumático
              compatível e avaliação clínica — não é sinônimo de estresse ocupacional.
            </p>
          )}
          {[...alertas.entries()].map(([tipo, n]) => (
            <p
              key={tipo}
              data-testid={`alerta-${tipo}`}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <strong>{n} ocorrência(s)</strong> — {TEXTO_ALERTA[tipo]}
            </p>
          ))}
          {semCorrespondencia.length > 0 && (
            <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              CID(s) sem correspondência na matriz Fatores × CID: <strong>{semCorrespondencia.join(", ")}</strong>.
              Entram nos indicadores, mas não agravam nenhum fator (a matriz não força um CID).
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
              <Th>Atestados</Th>
              <Th>Colab. com atestado</Th>
              <Th>Relacionados (colab.)</Th>
              <Th>Inconclusivos (colab.)</Th>
              <Th>Reincidentes</Th>
              <Th>Dias</Th>
              <Th>
                <span title="Colaboradores com atestado do setor ÷ nº de colaboradores do setor × 100. A mesma matrícula conta uma vez; atestado sem matrícula conta como uma pessoa.">
                  Colab. com atestado / Colab (%)
                </span>
              </Th>
              <Th>
                <span title="Atestados do setor ÷ nº de colaboradores × 100 (conta atestados, não pessoas).">
                  Atestados / Colab (%)
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
                  <Td className="tabular-nums">{s.colaboradoresComAtestado}</Td>
                  <Td className="tabular-nums">{s.colaboradoresRelacionados}</Td>
                  <Td className="tabular-nums">{s.colaboradoresInconclusivos}</Td>
                  <Td className="tabular-nums">{s.reincidentes}</Td>
                  <Td className="tabular-nums">{s.diasAfastados}</Td>
                  <Td className="tabular-nums">{s.taxaPor100 !== null ? `${s.taxaPor100.toFixed(1).replace(".", ",")}%` : "—"}</Td>
                  <Td className="tabular-nums">
                    {s.taxaAtestadosPor100 !== null ? `${s.taxaAtestadosPor100.toFixed(1).replace(".", ",")}%` : "—"}
                  </Td>
                  <Td>{agravados > 0 ? <Badge tom="perigo">{`${agravados} de ${fatores.length}`}</Badge> : <Badge>Nenhum</Badge>}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        {setores.some((s) => s.colaboradores === null) && (
          <p className="text-xs text-zinc-500 mt-2">
            Para as colunas de percentual, informe o nº de colaboradores em Setores e departamentos.
          </p>
        )}
      </section>

      {setores.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">Agravamento por fator de risco (×1,10)</h2>
          <p className="text-xs text-zinc-500 mb-2">
            Só ocorrências <strong>relacionadas ao trabalho</strong> agravam, e só os fatores compatíveis com o CID
            (matriz Fatores × CID, capítulos F e Z). Passe o mouse para ver o CID.
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
                <strong>{c.cid}</strong> · {c.total} atestado(s) · {c.colaboradores} colab.
              </span>
            ))}
          </div>
        </section>
      )}

      {reincidencias.length > 0 && (
        <section aria-label="Reincidência">
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">Reincidência ({reincidencias.length})</h2>
          <p className="text-xs text-zinc-500 mb-2 max-w-3xl">
            Colaboradores (por matrícula) com 2 ou mais atestados (CID F e Z, exceto os de natureza sensível). Visível só nesta tela — a matrícula não vai para
            relatórios nem planilhas.
          </p>
          <Table>
            <Thead>
              <Tr>
                <Th>Matrícula</Th>
                <Th>Setor</Th>
                <Th>Atestados</Th>
                <Th>CIDs</Th>
                <Th>Dias</Th>
              </Tr>
            </Thead>
            <tbody>
              {reincidencias.slice(0, LIMITE_LISTA).map((p) => (
                <Tr key={`${p.setorId ?? p.setor}|${p.matricula}`}>
                  <Td className="font-medium tabular-nums">{p.matricula}</Td>
                  <Td>{p.setor}</Td>
                  <Td className="tabular-nums">{p.itens.length}</Td>
                  <Td>{[...new Set(p.itens.map((o) => o.cid))].join(", ")}</Td>
                  <Td className="tabular-nums">{p.itens.reduce((a, o) => a + (o.diasAfastados ?? 0), 0)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 mb-2">Ocorrências ({filtradas.length})</h2>
        {ocultas > 0 && (
          <p data-testid="aviso-ocultas" className="text-xs text-zinc-500 mb-2 max-w-3xl">
            {ocultas} ocorrência(s) de CID Z de natureza sensível (uso de substâncias, histórico de lesão autoprovocada,
            exame após violência sexual) não são listadas individualmente, por proteção de dados (LGPD); entram nos
            indicadores, nos alertas e nas contagens.
          </p>
        )}
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
              <Th>Matrícula</Th>
              <Th>CID</Th>
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
                <Td className="tabular-nums">{o.matricula ?? <span className="text-zinc-300">—</span>}</Td>
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
