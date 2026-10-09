import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { PaginasFrprt } from "@/lib/relatorio-frprt-pdf";
import { PaginaPlano } from "@/lib/plano-acao-export";
import { CONCLUSOES, concluir, formatarRisco } from "@/lib/score-final";
import { secoesMetodologia, type Bloco } from "@/lib/relatorio/metodologia";
import { TEXTOS_RELATORIO } from "@/lib/textos-relatorio";
import { numeroDaDimensao } from "@/lib/dashboard";
import type { DadosRelatorio } from "@/lib/relatorio/relatorio-completo";

/**
 * Relatório completo FRPRT (pedido do cliente, out/2026): capa, sumário,
 * legislação, metodologia, Eixos 1–3, Painel FRPRT, plano de ação,
 * conclusão do consultor e quem assina. As páginas do Painel FRPRT e do
 * plano são os MESMOS componentes dos relatórios avulsos.
 *
 * Sumário com número de página: duas passagens — a primeira registra em
 * que página cada seção começou; a segunda imprime o sumário com eles.
 */

const AZUL = "#183b56";
const CINZA = "#71717a";

/** A Helvetica padrão (WinAnsi) não tem estes símbolos nem emojis. */
export function paraPdf(t: string): string {
  return t
    .replace(/≈/g, "~")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/−/g, "-")
    .replace(/→/g, "->")
    .replace(/[^\u0000-ÿ–—‘’“”•…€™‰]/gu, "");
}

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9.5, color: "#18181b", lineHeight: 1.4 },
  paisagem: { paddingTop: 26, paddingBottom: 40, paddingHorizontal: 26, fontSize: 8.5, color: "#18181b" },
  h1: { fontSize: 16, fontWeight: 700, color: AZUL, marginBottom: 10 },
  h2: { fontSize: 11.5, fontWeight: 700, color: AZUL, marginTop: 12, marginBottom: 5 },
  h3: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3 },
  p: { marginBottom: 6, textAlign: "justify" },
  pequeno: { fontSize: 8, color: CINZA },
  item: { flexDirection: "row", marginBottom: 3 },
  formula: { fontFamily: "Courier", fontSize: 8.5, backgroundColor: "#f4f4f5", padding: 6, marginBottom: 6 },
  tabCab: { flexDirection: "row", backgroundColor: "#f4f4f5", fontWeight: 700, color: "#52525b" },
  tabLinha: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e4e4e7" },
  cel: { paddingVertical: 3, paddingHorizontal: 4 },
  rodape: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: CINZA,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 4,
  },
  aviso: { borderWidth: 1, borderColor: "#fcd34d", backgroundColor: "#fffbeb", padding: 8, borderRadius: 4, marginBottom: 8 },
});

const dataBr = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const dataUtc = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

type Paginas = Record<string, number>;

const SECOES = [
  ["legislacao", "1. Dossiê da legislação"],
  ["metodologia", "2. Metodologia, pontuação e anonimato"],
  ["eixo1", "3. Eixo 1 — Percepção dos colaboradores"],
  ["eixo2", "4. Eixo 2 — Medidas de controle"],
  ["eixo3", "5. Eixo 3 — Atestados e afastamentos CID-F"],
  ["painel", "6. Painel FRPRT — índices, FMEA e PGR"],
  ["plano", "7. Plano de ação"],
  ["conclusao", "8. Conclusão do consultor"],
  ["assinaturas", "9. Responsáveis técnicos"],
] as const;
type ChaveSecao = (typeof SECOES)[number][0];

/** Marca, sem aparecer, a página onde a seção começa (1ª passagem). */
function Marcador({ chave, paginas }: { chave: ChaveSecao; paginas: Paginas }) {
  return (
    <Text
      style={{ fontSize: 1, color: "#ffffff" }}
      render={({ pageNumber }) => {
        if (!(chave in paginas)) paginas[chave] = pageNumber;
        return " ";
      }}
    />
  );
}

function Rodape({ empresa, versao, paisagem }: { empresa: string; versao: number | null; paisagem?: boolean }) {
  return (
    <View style={[s.rodape, paisagem ? { left: 26, right: 26, bottom: 14 } : {}]} fixed>
      <Text>
        {paraPdf(empresa)} · Relatório completo FRPRT · {versao ? `versão ${versao}` : "PRÉ-VISUALIZAÇÃO (não emitido)"}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function TituloSecao({ chave, paginas }: { chave: ChaveSecao; paginas: Paginas }) {
  return (
    <>
      <Marcador chave={chave} paginas={paginas} />
      <Text style={s.h1}>{SECOES.find(([k]) => k === chave)![1]}</Text>
    </>
  );
}

function Tabela({ colunas, linhas, larguras }: { colunas: string[]; linhas: string[][]; larguras?: string[] }) {
  const w = (i: number) => larguras?.[i] ?? `${100 / colunas.length}%`;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={s.tabCab} fixed>
        {colunas.map((c, i) => (
          <Text key={i} style={[s.cel, { width: w(i) }]}>
            {paraPdf(c)}
          </Text>
        ))}
      </View>
      {linhas.map((l, j) => (
        <View key={j} style={s.tabLinha} wrap={false}>
          {l.map((c, i) => (
            <Text key={i} style={[s.cel, { width: w(i) }]}>
              {paraPdf(c)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <>
      {blocos.map((b, i) =>
        b.tipo === "p" ? (
          <Text key={i} style={s.p}>
            {paraPdf(b.texto)}
          </Text>
        ) : b.tipo === "formula" ? (
          <Text key={i} style={s.formula}>
            {paraPdf(b.texto)}
          </Text>
        ) : b.tipo === "lista" ? (
          <View key={i} style={{ marginBottom: 6 }}>
            {b.itens.map((it, j) => (
              <View key={j} style={s.item}>
                <Text style={{ width: 10 }}>•</Text>
                <Text style={{ flex: 1 }}>{paraPdf(it)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Tabela key={i} colunas={b.colunas} linhas={b.linhas} />
        ),
      )}
    </>
  );
}

/**
 * Texto livre (legislação, conclusão): linha em branco separa parágrafos;
 * "# " vira subtítulo; "- " vira item de lista.
 */
function TextoLivre({ texto }: { texto: string }) {
  const blocos = texto.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocos.map((b, i) => {
        const linhas = b.split("\n");
        if (linhas.every((l) => /^\s*-\s+/.test(l))) {
          return (
            <View key={i} style={{ marginBottom: 6 }}>
              {linhas.map((l, j) => (
                <View key={j} style={s.item}>
                  <Text style={{ width: 10 }}>•</Text>
                  <Text style={{ flex: 1 }}>{paraPdf(l.replace(/^\s*-\s+/, ""))}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (linhas.length === 1 && /^#\s+/.test(b)) {
          return (
            <Text key={i} style={s.h2}>
              {paraPdf(b.replace(/^#\s+/, ""))}
            </Text>
          );
        }
        return (
          <Text key={i} style={s.p}>
            {paraPdf(b)}
          </Text>
        );
      })}
    </>
  );
}

/** Célula colorida pela faixa do índice (mesmas cores do painel). */
function CelIndice({ valor, largura }: { valor: number | null; largura: string }) {
  if (valor === null) {
    return <Text style={[s.cel, { width: largura, textAlign: "center", color: CINZA }]}>—</Text>;
  }
  const c = CONCLUSOES[concluir(valor)];
  return (
    <Text style={[s.cel, { width: largura, textAlign: "center", backgroundColor: c.fundo, color: c.cor, fontWeight: 700 }]}>
      {formatarRisco(valor)}
    </Text>
  );
}

function Documento({ d, paginas }: { d: DadosRelatorio; paginas: Paginas }) {
  const { painel } = d;
  const { opcoes, fatores, linhas } = painel;
  const logo = d.logo ? `data:image/${d.logo.formato};base64,${d.logo.buffer.toString("base64")}` : undefined;
  const rodape = <Rodape empresa={d.empresa} versao={d.versao} />;
  const rodapePaisagem = <Rodape empresa={d.empresa} versao={d.versao} paisagem />;
  const setoresOrdem = [...linhas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const numFator = (nome: string) => `F${numeroDaDimensao(nome) ?? "?"}`;
  const larguraFator = `${(100 - 22 - 6) / Math.max(fatores.length, 1)}%`;
  const metodologia = secoesMetodologia(d.metodologia);

  return (
    <Document title={`Relatório completo FRPRT — ${d.empresa}`} author="Plataforma FRPRT">
      {/* Capa */}
      <Page size="A4" style={[s.page, { justifyContent: "space-between" }]}>
        <View>
          {logo ? <Image src={logo} style={{ maxHeight: 70, maxWidth: 220, objectFit: "contain", marginBottom: 30 }} /> : null}
          <Text style={{ fontSize: 11, color: CINZA, marginBottom: 6 }}>RELATÓRIO COMPLETO</Text>
          <Text style={{ fontSize: 22, fontWeight: 700, color: AZUL, lineHeight: 1.25 }}>
            Avaliação dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT)
          </Text>
          <Text style={{ fontSize: 15, marginTop: 18, fontWeight: 700 }}>{paraPdf(d.empresa)}</Text>
        </View>
        <View style={{ borderTopWidth: 2, borderTopColor: AZUL, paddingTop: 10 }}>
          <Text>
            Eixo 1 · Pesquisa:{" "}
            {opcoes.pesquisa
              ? `${paraPdf(opcoes.pesquisa.nome)} (${dataUtc(opcoes.pesquisa.dataInicio)} a ${dataUtc(opcoes.pesquisa.dataFim)})`
              : "não considerada"}
          </Text>
          <Text>Eixo 2 · Avaliação: {opcoes.avaliacao ? paraPdf(opcoes.avaliacao.nome) : "não considerada (×1,00)"}</Text>
          <Text>
            Eixo 3 · Levantamento:{" "}
            {opcoes.levantamento
              ? `${paraPdf(opcoes.levantamento.nome)} (${dataUtc(opcoes.levantamento.periodoInicio)} a ${dataUtc(opcoes.levantamento.periodoFim)})`
              : "não considerado (×1,00)"}
          </Text>
          <Text style={{ marginTop: 8, fontWeight: 700 }}>
            {d.versao ? `Versão ${d.versao} · emitida em ${dataBr(d.emissao)}` : `Pré-visualização de ${dataBr(d.emissao)} — documento não emitido`}
          </Text>
        </View>
      </Page>

      {/* Sumário */}
      <Page size="A4" style={s.page}>
        {rodape}
        <Text style={s.h1}>Sumário</Text>
        {SECOES.map(([k, titulo]) => (
          <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f4f4f5", paddingVertical: 5 }}>
            <Text>{titulo}</Text>
            <Text>{paginas[k] ?? ""}</Text>
          </View>
        ))}
      </Page>

      {/* 1. Legislação */}
      <Page size="A4" style={s.page}>
        {rodape}
        <TituloSecao chave="legislacao" paginas={paginas} />
        {d.legislacao ? (
          <TextoLivre texto={d.legislacao} />
        ) : (
          <Text style={s.aviso}>{TEXTOS_RELATORIO.LEGISLACAO.vazio}</Text>
        )}
      </Page>

      {/* 2. Metodologia */}
      <Page size="A4" style={s.page}>
        {rodape}
        <TituloSecao chave="metodologia" paginas={paginas} />
        {metodologia.map((sec) => (
          <View key={sec.titulo}>
            <Text style={s.h2} minPresenceAhead={60}>
              {paraPdf(sec.titulo)}
            </Text>
            <Blocos blocos={sec.blocos} />
          </View>
        ))}
      </Page>

      {/* 3. Eixo 1 — setor × fator */}
      <Page size="A4" orientation="landscape" style={s.paisagem}>
        {rodapePaisagem}
        <TituloSecao chave="eixo1" paginas={paginas} />
        <Text style={[s.pequeno, { marginBottom: 6 }]}>
          Índice do Eixo 1 por setor e fator (média 1–5; quanto maior, maior a exposição).{" "}
          {opcoes.pesquisa ? `${paraPdf(opcoes.pesquisa.nome)}.` : "Sem pesquisa considerada."} Setores com menos de {painel.limite}{" "}
          respostas não têm índice exibido (anonimato).
        </Text>
        <View style={s.tabCab} fixed>
          <Text style={[s.cel, { width: "22%" }]}>Setor</Text>
          <Text style={[s.cel, { width: "6%", textAlign: "center" }]}>Resp.</Text>
          {fatores.map((f) => (
            <Text key={f.id} style={[s.cel, { width: larguraFator, textAlign: "center" }]}>
              {numFator(f.nome)}
            </Text>
          ))}
        </View>
        {setoresOrdem.map((l) => (
          <View key={l.setorId} style={s.tabLinha} wrap={false}>
            <Text style={[s.cel, { width: "22%" }]}>{paraPdf(l.nome)}</Text>
            <Text style={[s.cel, { width: "6%", textAlign: "center" }]}>{l.respondentes}</Text>
            {l.suprimido ? (
              <Text style={[s.cel, { width: `${100 - 28}%`, color: CINZA }]}>
                Amostra insuficiente (n={l.respondentes}, mín. {painel.limite}) — protege o anonimato
              </Text>
            ) : (
              fatores.map((f) => (
                <CelIndice key={f.id} valor={l.celulas.find((c) => c.fatorId === f.id)?.eixo1 ?? null} largura={larguraFator} />
              ))
            )}
          </View>
        ))}
        <Text style={[s.pequeno, { marginTop: 8 }]}>
          {fatores.map((f) => `${numFator(f.nome)} ${f.nome.replace(/^\s*\d+\.\s*/, "")}`).join(" · ")}
        </Text>
      </Page>

      {/* 4. Eixo 2 */}
      <Page size="A4" orientation="landscape" style={s.paisagem}>
        {rodapePaisagem}
        <TituloSecao chave="eixo2" paginas={paginas} />
        {!d.eixo2 ? (
          <Text>Nenhuma avaliação do Eixo 2 considerada: todos os fatores entram como ×1,00.</Text>
        ) : (
          <>
            <Text style={[s.pequeno, { marginBottom: 6 }]}>
              {paraPdf(d.eixo2.nome)} — fator de controle por setor e fator (×0,80 eficaz · ×0,90 precisa melhorar · ×1,00
              inexistente). Setor fora da avaliação: ×1,00.
            </Text>
            <View style={s.tabCab} fixed>
              <Text style={[s.cel, { width: "28%" }]}>Setor</Text>
              {fatores.map((f) => (
                <Text key={f.id} style={[s.cel, { width: larguraFator, textAlign: "center" }]}>
                  {numFator(f.nome)}
                </Text>
              ))}
            </View>
            {setoresOrdem.map((l) => (
              <View key={l.setorId} style={s.tabLinha} wrap={false}>
                <Text style={[s.cel, { width: "28%" }]}>
                  {paraPdf(l.nome)}
                  {d.eixo2!.setores.some((x) => x.id === l.setorId && !x.completo) ? " (incompleta)" : ""}
                </Text>
                {fatores.map((f) => {
                  const c = l.celulas.find((x) => x.fatorId === f.id);
                  return (
                    <Text key={f.id} style={[s.cel, { width: larguraFator, textAlign: "center", color: c?.semEixo2 ? CINZA : "#18181b" }]}>
                      {c ? `${c.semEixo2 ? "—" : "×" + c.fatorEixo2.toFixed(2).replace(".", ",")}` : "—"}
                    </Text>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </Page>
      {/* Planos do Eixo 2 em página própria: o cabeçalho fixo da matriz acima não pode se repetir aqui. */}
      {d.eixo2 && (
        <Page size="A4" orientation="landscape" style={s.paisagem}>
          {rodapePaisagem}
          <Text style={s.h2}>Planos de ação registrados no Eixo 2</Text>
          {d.eixo2.planos.length === 0 ? (
            <Text style={s.pequeno}>Nenhum plano registrado na avaliação.</Text>
          ) : (
            <Tabela
              colunas={["Setor", "Fator", "Questão", "Plano de ação"]}
              larguras={["16%", "18%", "30%", "36%"]}
              linhas={d.eixo2.planos.map((p) => [p.setor, p.dimensao, p.questao, p.plano])}
            />
          )}
        </Page>
      )}

      {/* 5. Eixo 3 */}
      <Page size="A4" style={s.page}>
        {rodape}
        <TituloSecao chave="eixo3" paginas={paginas} />
        {!d.eixo3 || !opcoes.levantamento ? (
          <Text>Nenhum levantamento do Eixo 3 considerado: todos os fatores entram como ×1,00.</Text>
        ) : (
          <>
            <Text style={[s.pequeno, { marginBottom: 6 }]}>
              {paraPdf(opcoes.levantamento.nome)} — indicadores agregados por setor, sem identificação de trabalhador.
              {opcoes.levantamento.declaracaoAceitaEm
                ? ` Publicado com declaração de veracidade de ${paraPdf(opcoes.levantamento.responsavel ?? "responsável RH/DP")} em ${dataBr(opcoes.levantamento.declaracaoAceitaEm)}.`
                : ""}
            </Text>
            <Tabela
              colunas={["Setor", "Ocorrências", "Relacionadas", "Inconclusivas", "Dias afastados", "Ocorrência / Colab (%)", "Fatores agravados"]}
              larguras={["24%", "11%", "12%", "12%", "12%", "15%", "14%"]}
              linhas={d.eixo3.setores.map((x) => [
                x.nome,
                String(x.ocorrencias),
                String(x.relacionadas),
                String(x.inconclusivas),
                String(x.diasAfastados),
                x.taxaPor100 !== null ? `${x.taxaPor100.toFixed(1).replace(".", ",")}%` : "—",
                `${[...x.fatorPorFator.values()].filter((v) => v > 1).length} de ${fatores.length}`,
              ])}
            />
            <Text style={s.h2}>CIDs mais frequentes (por categoria)</Text>
            <Text>{d.eixo3.cidsFrequentes.map((c) => `${c.cid} (${c.total})`).join(" · ") || "—"}</Text>
            <Text style={[s.pequeno, { marginTop: 8 }]}>
              O CID não comprova nexo causal isoladamente: o Eixo 3 é indicador agravante coletivo. Ocorrência / Colab (%)
              conta ocorrências, não pessoas.
            </Text>
          </>
        )}
      </Page>

      {/* 6. Painel FRPRT (as mesmas páginas do relatório avulso) */}
      <PaginasFrprt
        workspaceNome={d.empresa}
        painel={painel}
        logo={d.logo ?? undefined}
        rodape={rodapePaisagem}
        inicio={<TituloSecao chave="painel" paginas={paginas} />}
      />

      {/* 7. Plano de ação */}
      <PaginaPlano
        acoes={d.acoes}
        empresa={d.empresa}
        hoje={d.emissao.toISOString().slice(0, 10)}
        rodape={rodapePaisagem}
        inicio={<TituloSecao chave="plano" paginas={paginas} />}
      />

      {/* 8. Conclusão */}
      <Page size="A4" style={s.page}>
        {rodape}
        <TituloSecao chave="conclusao" paginas={paginas} />
        {d.conclusao ? <TextoLivre texto={d.conclusao} /> : <Text style={s.aviso}>Conclusão ainda não redigida pelo consultor.</Text>}
      </Page>

      {/* 9. Assinaturas */}
      <Page size="A4" style={s.page}>
        {rodape}
        <TituloSecao chave="assinaturas" paginas={paginas} />
        {d.consultores.length === 0 ? (
          <Text style={s.aviso}>Nenhum consultor selecionado para assinar.</Text>
        ) : (
          d.consultores.map((c, i) => (
            <View key={i} style={{ marginTop: 34 }} wrap={false}>
              <View style={{ borderTopWidth: 1, borderTopColor: "#18181b", width: 260, marginBottom: 4 }} />
              <Text style={{ fontWeight: 700 }}>{paraPdf(c.nome)}</Text>
              {c.formacao && <Text>{paraPdf(c.formacao)}</Text>}
              {c.registro && <Text>{paraPdf(c.registro)}</Text>}
              {c.cargo && <Text>{paraPdf(c.cargo)}</Text>}
              {c.email && <Text style={s.pequeno}>{paraPdf(c.email)}</Text>}
            </View>
          ))
        )}
        <Text style={[s.pequeno, { marginTop: 30 }]}>
          Documento assinado digitalmente após a emissão. {d.versao ? `Versão ${d.versao}, emitida em ${dataBr(d.emissao)}.` : ""}
        </Text>
      </Page>
    </Document>
  );
}

/** Gera o PDF em duas passagens (a 1ª só descobre as páginas do sumário). */
export async function gerarRelatorioCompletoPdf(d: DadosRelatorio): Promise<Buffer> {
  const paginas: Paginas = {};
  await renderToBuffer(<Documento d={d} paginas={paginas} />);
  const fixas = { ...paginas };
  return renderToBuffer(<Documento d={d} paginas={fixas} />);
}
