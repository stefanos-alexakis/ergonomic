import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { PainelFrprt } from "@/lib/painel-frprt";
import { CONCLUSOES, formatarEfeito, formatarRisco, posicaoNaRegua } from "@/lib/score-final";
import { ORIENTACOES_EIXO3 } from "@/lib/planilha-modelo-eixo3";
import {
  FAIXAS_D,
  FAIXAS_O,
  MATRIZ_S_O,
  PRIORIDADES,
  textoRegraPrazo,
  ROTULO_AGRAVANTE,
  type Prazos,
  type Prioridade,
} from "@/lib/fmea";
import type { ItemFmea } from "@/lib/painel-frprt";

/**
 * Relatório FRPRT — mesma ordem e linguagem visual do painel: resultado
 * geral em destaque (índice, cor e descrição), pontuação dos
 * setores, principais achados, e depois o detalhamento (matriz de decisão,
 * riscos para o PGR, fontes e nota metodológica).
 */

const AZUL = "#183b56";
const CINZA = "#71717a";

const s = StyleSheet.create({
  page: { padding: 26, fontSize: 8.5, color: "#18181b" },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
  },
  marca: { fontSize: 24, fontWeight: 700, color: AZUL },
  tituloPainel: { fontSize: 13, fontWeight: 700, color: AZUL },
  subPainel: { fontSize: 8.5, color: CINZA },
  info: { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8, marginLeft: 6 },
  infoRotulo: { fontSize: 7, color: CINZA },
  infoValor: { fontSize: 9, fontWeight: 700 },
  secao: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 8 },
  bolinha: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AZUL,
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 4,
    marginRight: 6,
  },
  secaoTitulo: { fontSize: 12, fontWeight: 700, color: AZUL },
  linha: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f4f4f5", paddingVertical: 4 },
  pequeno: { fontSize: 7.5, color: CINZA },
  caixa: { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, padding: 8, marginBottom: 6 },
});

const data = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
/** Helvetica padrão (WinAnsi) não tem o sinal "−" tipográfico. */
const efeito = (v: number) => formatarEfeito(v).replace("−", "-");
const mes = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");

function Secao({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <View style={s.secao}>
      <Text style={s.bolinha}>{numero}</Text>
      <Text style={s.secaoTitulo}>{titulo.toUpperCase()}</Text>
    </View>
  );
}

function Cabecalho({ empresa, periodo, logo }: { empresa: string; periodo: string | null; logo?: string }) {
  return (
    <View style={s.cabecalho} fixed>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={s.marca}>FRPRT</Text>
        <View style={{ width: 1, height: 24, backgroundColor: "#d4d4d8", marginHorizontal: 10 }} />
        <View>
          <Text style={s.tituloPainel}>Painel de indicadores</Text>
          <Text style={s.subPainel}>Fatores de Risco Psicossociais Relacionados ao Trabalho</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {logo && <Image src={logo} style={{ width: 26, height: 26, objectFit: "contain", marginRight: 4 }} />}
        <View style={s.info}>
          <Text style={s.infoRotulo}>Empresa</Text>
          <Text style={s.infoValor}>{empresa}</Text>
        </View>
        {periodo && (
          <View style={s.info}>
            <Text style={s.infoRotulo}>Período da análise</Text>
            <Text style={s.infoValor}>{periodo}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Barra horizontal (fundo cinza + preenchimento) com o valor ao lado. */
function Barra({ valor, maximo, cor, texto, largura = 70 }: { valor: number; maximo: number; cor: string; texto: string; largura?: number }) {
  const pct = Math.min(100, Math.max(0, (Math.abs(valor) / maximo) * 100));
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: largura, height: 7, backgroundColor: "#e4e4e7", borderRadius: 2 }}>
        <View style={{ width: `${pct}%`, height: 7, backgroundColor: cor, borderRadius: 2 }} />
      </View>
      <Text style={{ width: 30, textAlign: "right", fontSize: 8.5 }}>{texto}</Text>
    </View>
  );
}

const dataLocal = (d: Date) => d.toLocaleDateString("pt-BR");
/** A Helvetica padrão (WinAnsi) não tem estes símbolos — texto livre do admin passa por aqui. */
const paraPdf = (t: string) =>
  t.replace(/≈/g, "~").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-").replace(/→/g, "->");
const COR_NOTA = ["#4d7c0f", "#a16207", "#c2410c", "#b91c1c", "#7f1d1d"];

function Prio({ p }: { p: Prioridade }) {
  return (
    <Text
      style={{
        backgroundColor: PRIORIDADES[p].fundo,
        color: PRIORIDADES[p].cor,
        fontWeight: 700,
        fontSize: 8,
        paddingVertical: 1,
        paddingHorizontal: 5,
        borderRadius: 3,
      }}
    >
      {PRIORIDADES[p].rotulo}
    </Text>
  );
}

function NotaFmea({ v }: { v: number }) {
  return (
    <Text
      style={{
        backgroundColor: COR_NOTA[v - 1],
        color: "#fff",
        fontWeight: 700,
        width: 14,
        textAlign: "center",
        paddingVertical: 1.5,
        borderRadius: 2,
      }}
    >
      {v}
    </Text>
  );
}

function textoPrazosOuAcoes(pz: Prazos, acoes: ItemFmea["acoes"]): string {
  if (acoes.length === 0) return `${textoPrazos(pz)} (sugerido pela FMEA)`;
  return acoes
    .map((a) =>
      a.fase === "VERIFICAR" || a.fase === "CONCLUIDA"
        ? `Ação #${a.numero}: reavaliar em ${a.reavaliarEm ? formatarDiaPdf(a.reavaliarEm) : "—"}`
        : `Ação #${a.numero}: prazo ${a.prazo ? formatarDiaPdf(a.prazo) : "—"}`,
    )
    .join(" · ");
}

/** Coluna @db.Date chega como meia-noite UTC — formata sem deslocar pelo fuso. */
const formatarDiaPdf = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

function textoPrazos(pz: Prazos): string {
  return pz.plano
    ? `Plano até ${dataLocal(pz.plano)} · medidas até ${dataLocal(pz.implantacao!)} · reavaliar em ${dataLocal(pz.reavaliacao)}`
    : `Manter os controles · reavaliar em ${dataLocal(pz.reavaliacao)}`;
}

function TabelaFmeaPdf({ itens, vazio }: { itens: ItemFmea[]; vazio: string }) {
  if (itens.length === 0) return <Text style={{ marginBottom: 6 }}>{vazio}</Text>;
  const col = { prio: "9%", nome: "33%", idx: "7%", n: "5%", rpn: "6%", prazo: "30%" };
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 3, fontWeight: 700, color: "#52525b", fontSize: 7.5 }}>
        <Text style={{ width: col.prio, paddingHorizontal: 3 }}>Prioridade</Text>
        <Text style={{ width: col.nome, paddingHorizontal: 3 }}>Setor · fator</Text>
        <Text style={{ width: col.idx, textAlign: "center" }}>Índice</Text>
        <Text style={{ width: col.n, textAlign: "center" }}>S</Text>
        <Text style={{ width: col.n, textAlign: "center" }}>O</Text>
        <Text style={{ width: col.n, textAlign: "center" }}>D</Text>
        <Text style={{ width: col.rpn, textAlign: "center" }}>RPN</Text>
        <Text style={{ width: col.prazo, paddingHorizontal: 3 }}>Prazos / plano de ação</Text>
      </View>
      {itens.map((i) => (
        <View key={`${i.setorId}-${i.fator.id}`} style={s.linha} wrap={false}>
          <View style={{ width: col.prio, paddingHorizontal: 3, alignItems: "flex-start" }}>
            <Prio p={i.fmea.prioridade} />
          </View>
          <View style={{ width: col.nome, paddingHorizontal: 3 }}>
            <Text style={{ fontWeight: 700 }}>
              {i.setor} · {i.fator.nome}
            </Text>
            <Text style={{ fontSize: 7, color: CINZA }}>
              S-base {i.fmea.sBase}
              {i.fmea.agravantes.map((a) => ` · +1 ${ROTULO_AGRAVANTE[a]}`).join("")}
            </Text>
          </View>
          <Text style={{ width: col.idx, textAlign: "center", color: CONCLUSOES[i.celula.conclusao!].cor, fontWeight: 700 }}>
            {formatarRisco(i.celula.final!)}
          </Text>
          <View style={{ width: col.n, alignItems: "center" }}>
            <NotaFmea v={i.fmea.s} />
          </View>
          <View style={{ width: col.n, alignItems: "center" }}>
            <NotaFmea v={i.fmea.o} />
          </View>
          <View style={{ width: col.n, alignItems: "center" }}>
            <NotaFmea v={i.fmea.d} />
          </View>
          <Text style={{ width: col.rpn, textAlign: "center", fontWeight: 700 }}>{i.fmea.rpn}</Text>
          <Text style={{ width: col.prazo, paddingHorizontal: 3, fontSize: 7.5 }}>{textoPrazosOuAcoes(i.prazos, i.acoes)}</Text>
        </View>
      ))}
    </View>
  );
}

export async function gerarRelatorioFrprtPdf(params: {
  workspaceNome: string;
  painel: PainelFrprt;
  logo?: { buffer: Buffer; formato: "png" | "jpeg" };
}): Promise<Buffer> {
  const { workspaceNome, painel } = params;
  const { opcoes, fatores, linhas, principais, pgr, limite, geral, achados, fmea } = painel;
  const logo = params.logo ? `data:image/${params.logo.formato};base64,${params.logo.buffer.toString("base64")}` : undefined;
  const periodo = opcoes.pesquisa
    ? `${mes(opcoes.pesquisa.dataInicio)}–${mes(opcoes.pesquisa.dataFim)}/${opcoes.pesquisa.dataFim.getUTCFullYear()}`
    : null;
  const nomeFator = (id: string) => fatores.find((f) => f.id === id)?.nome ?? "";
  const cab = <Cabecalho empresa={workspaceNome} periodo={periodo} logo={logo} />;
  const corAchado = { perigo: "#B91C1C", atencao: "#B45309", sucesso: "#047857", neutro: CINZA } as const;

  const doc = (
    <Document title={`Relatório FRPRT — ${workspaceNome}`}>
      {/* Página 1 — resultado geral e setores */}
      <Page size="A4" orientation="landscape" style={s.page}>
        {cab}
        {geral ? (
          <View style={{ flexDirection: "row" }}>
            {/* Resultado geral em destaque */}
            <View
              style={{
                width: "46%",
                borderWidth: 2,
                borderColor: CONCLUSOES[geral.conclusao].cor,
                backgroundColor: CONCLUSOES[geral.conclusao].fundo,
                borderRadius: 6,
                padding: 12,
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#52525b" }}>RESULTADO GERAL DA EMPRESA</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
                <Text style={{ fontSize: 40, fontWeight: 700, color: CONCLUSOES[geral.conclusao].cor }}>
                  {formatarRisco(geral.final)}
                </Text>
                <View style={{ marginLeft: 10, marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: 700, color: CONCLUSOES[geral.conclusao].cor }}>
                    {CONCLUSOES[geral.conclusao].rotulo}
                  </Text>
                  <Text>{CONCLUSOES[geral.conclusao].curto} · índice de 1 a 5</Text>
                </View>
              </View>
              <Text style={{ marginTop: 4 }}>{CONCLUSOES[geral.conclusao].descricao}</Text>

              {/* Régua 1–5 com marcador */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", height: 8, borderRadius: 4 }}>
                  <View style={{ width: "50%", backgroundColor: "#6ee7b7" }} />
                  <View style={{ width: "25%", backgroundColor: "#fcd34d" }} />
                  <View style={{ width: "25%", backgroundColor: "#f87171" }} />
                </View>
                <View
                  style={{
                    position: "absolute",
                    left: `${posicaoNaRegua(geral.final)}%`,
                    top: -3,
                    width: 3,
                    height: 14,
                    marginLeft: -1.5,
                    backgroundColor: "#18181b",
                  }}
                />
                <View style={{ flexDirection: "row", marginTop: 3 }}>
                  <Text style={{ width: "50%", fontSize: 7, color: CONCLUSOES.SEM_RISCO.cor }}>1 · Baixo risco</Text>
                  <Text style={{ width: "25%", fontSize: 7, color: CONCLUSOES.CONTROLE.cor }}>3 · Médio risco</Text>
                  <Text style={{ width: "25%", fontSize: 7, color: CONCLUSOES.RISCO_EXISTENTE.cor, textAlign: "right" }}>
                    4 · Alto risco (PGR) · 5
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", marginTop: 10 }}>
                {[
                  [geral.setoresAvaliados, "setores avaliados"],
                  [geral.setoresEmRisco, "setores em risco alto"],
                  [geral.fatoresPgr, "itens para o PGR"],
                  [geral.participacao !== null ? `${Math.round(geral.participacao * 100)}%` : "—", "participação"],
                ].map(([v, r]) => (
                  <View key={String(r)} style={{ width: "25%", backgroundColor: "#ffffffb0", borderRadius: 3, padding: 4, marginRight: 3 }}>
                    <Text style={{ fontSize: 13, fontWeight: 700 }}>{v}</Text>
                    <Text style={{ fontSize: 7 }}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Cartões dos setores */}
            <View style={{ width: "54%" }}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: "#52525b", marginBottom: 4 }}>PONTUAÇÃO DOS SETORES</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {[...linhas]
                  .sort((a, b) => (b.final ?? -1) - (a.final ?? -1))
                  .map((l) => {
                    const c = l.conclusao ? CONCLUSOES[l.conclusao] : null;
                    return (
                      <View
                        key={l.setorId}
                        style={{
                          width: "48.5%",
                          marginRight: "1.5%",
                          marginBottom: 5,
                          borderWidth: 1,
                          borderColor: c?.cor ?? "#e4e4e7",
                          backgroundColor: c?.fundo ?? "#ffffff",
                          borderRadius: 4,
                          padding: 6,
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        wrap={false}
                      >
                        <View style={{ width: "62%" }}>
                          <Text style={{ fontWeight: 700 }}>{l.nome}</Text>
                          <Text style={{ fontSize: 7, color: c?.cor ?? CINZA }}>
                            {c ? `${c.curto}${l.fatoresEmRisco ? ` · ${l.fatoresEmRisco} p/ PGR` : ""}` : l.suprimido ? `Amostra insuficiente (n=${l.respondentes})` : "Sem dados"}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 17, fontWeight: 700, color: c?.cor ?? "#a1a1aa" }}>
                            {l.final !== null ? formatarRisco(l.final) : "—"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          </View>
        ) : (
          <Text>Ainda não há setores com score (mínimo de {limite} respostas por setor no Eixo 1).</Text>
        )}

        <Secao numero={1} titulo="Painel resumido por setor" />
        <View style={{ flexDirection: "row", fontWeight: 700, fontSize: 7.5 }}>
          <Text style={{ width: "16%", backgroundColor: "#3f4f5c", color: "#fff", padding: 4 }}>Setor</Text>
          <Text style={{ width: "9%", backgroundColor: "#3f4f5c", color: "#fff", padding: 4, textAlign: "right" }}>Colab.</Text>
          <Text style={{ width: "9%", backgroundColor: "#3f4f5c", color: "#fff", padding: 4, textAlign: "right" }}>Particip.</Text>
          <Text style={{ width: "18%", backgroundColor: "#cfe2f3", color: AZUL, padding: 4 }}>Eixo 01 · percepção</Text>
          <Text style={{ width: "18%", backgroundColor: "#cdeadf", color: "#14532d", padding: 4 }}>Eixo 02 · controle</Text>
          <Text style={{ width: "18%", backgroundColor: "#fde3c8", color: "#7c2d12", padding: 4 }}>Eixo 03 · atestados</Text>
          <Text style={{ width: "12%", backgroundColor: AZUL, color: "#fff", padding: 4, textAlign: "center" }}>Score final</Text>
        </View>
        {linhas.map((l) => (
          <View key={l.setorId} style={s.linha} wrap={false}>
            <Text style={{ width: "16%", paddingHorizontal: 4, fontWeight: 700 }}>{l.nome}</Text>
            <Text style={{ width: "9%", paddingHorizontal: 4, textAlign: "right" }}>{l.colaboradores ?? "—"}</Text>
            <Text style={{ width: "9%", paddingHorizontal: 4, textAlign: "right" }}>
              {l.participacao !== null ? `${Math.round(l.participacao * 100)}%` : `${l.respondentes} resp.`}
            </Text>
            {l.suprimido || l.final === null ? (
              <Text style={{ width: "66%", textAlign: "center", color: "#a1a1aa" }}>
                {l.suprimido ? `Amostra insuficiente no Eixo 1 (n=${l.respondentes}, mín. ${limite})` : "Sem dados do Eixo 1"}
              </Text>
            ) : (
              <>
                <View style={{ width: "18%", paddingHorizontal: 4 }}>
                  <Barra valor={l.eixo1 ?? 0} maximo={5} cor="#4a86b5" texto={formatarRisco(l.eixo1 ?? 0)} />
                </View>
                <View style={{ width: "18%", paddingHorizontal: 4 }}>
                  <Barra valor={l.efeitoEixo2 ?? 0} maximo={1} cor="#5fae8f" texto={efeito(l.efeitoEixo2 ?? 0)} />
                </View>
                <View style={{ width: "18%", paddingHorizontal: 4 }}>
                  <Barra valor={l.efeitoEixo3 ?? 0} maximo={0.6} cor="#f39a5b" texto={efeito(l.efeitoEixo3 ?? 0)} />
                </View>
                <View style={{ width: "12%", alignItems: "center" }}>
                  <Text
                    style={{
                      backgroundColor: CONCLUSOES[l.conclusao!].fundo,
                      color: CONCLUSOES[l.conclusao!].cor,
                      fontSize: 12,
                      fontWeight: 700,
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      borderRadius: 3,
                    }}
                  >
                    {formatarRisco(l.final)}
                  </Text>
                </View>
              </>
            )}
          </View>
        ))}
        <Text style={[s.pequeno, { marginTop: 4 }]}>
          Risco final = Eixo 1 × Eixo 2 × Eixo 3 (1–5, quanto maior, pior). Eixos 2 e 3 em pontos: quanto moveram o
          Eixo 1. Até 3,00 sem risco · 3,01 a 4,00 com controle existente · acima de 4,00 risco existente (PGR).
        </Text>
      </Page>

      {/* Página 2 — principais achados */}
      <Page size="A4" orientation="landscape" style={s.page}>
        {cab}
        <Secao numero={2} titulo="Principais achados" />
        {achados.map((a) => (
          <View key={a.texto} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }} wrap={false}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: corAchado[a.tom], marginRight: 6 }} />
            <Text style={{ fontSize: 9.5 }}>{a.texto}</Text>
          </View>
        ))}

        {principais.length > 0 && (
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <View style={[s.caixa, { width: "50%", marginRight: 10 }]}>
              <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 6 }}>FATORES MAIS APONTADOS</Text>
              {principais.map((p) => {
                const cor = p.mediaFinal > 4 ? "#dc4a4f" : p.mediaFinal > 3.5 ? "#f39a5b" : p.mediaFinal > 3 ? "#f6c76b" : "#7fbf9f";
                return (
                  <View key={p.fator.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 5 }}>
                    <Text style={{ width: "48%" }}>{p.fator.nome}</Text>
                    <Barra valor={p.percentual * 100} maximo={100} cor={cor} texto={`${Math.round(p.percentual * 100)}%`} largura={130} />
                  </View>
                );
              })}
              <Text style={s.pequeno}>% dos setores em que o fator ficou acima de 3,00.</Text>
            </View>
            <View style={[s.caixa, { width: "48%" }]}>
              <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 6 }}>POSSIBILIDADES DE TRATATIVAS (MACRO)</Text>
              {principais
                .filter((p) => p.tratativas[0])
                .map((p) => (
                  <View key={p.fator.id} style={{ marginBottom: 5 }}>
                    <Text>• {p.tratativas[0]}</Text>
                    <Text style={s.pequeno}>{p.fator.nome}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </Page>

      {/* Página 3 — Matriz FMEA */}
      <Page size="A4" orientation="landscape" style={s.page}>
        {cab}
        <Secao numero={3} titulo="Matriz FMEA — prioridade de ação" />
        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          {/* Mapa S × O com a contagem */}
          <View style={{ marginRight: 16 }}>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 24 }} />
              {[1, 2, 3, 4, 5].map((o) => (
                <Text key={o} style={{ width: 26, textAlign: "center", fontSize: 7, color: CINZA }}>
                  O {o}
                </Text>
              ))}
            </View>
            {[5, 4, 3, 2, 1].map((sv) => (
              <View key={sv} style={{ flexDirection: "row", marginTop: 2 }}>
                <Text style={{ width: 24, fontSize: 7, color: CINZA, paddingTop: 5 }}>S {sv}</Text>
                {[1, 2, 3, 4, 5].map((o) => {
                  const pr = PRIORIDADES[MATRIZ_S_O[sv - 1]![o - 1]!];
                  const n = fmea.contagemSO[sv - 1]![o - 1]!;
                  return (
                    <Text
                      key={o}
                      style={{
                        width: 24,
                        marginRight: 2,
                        height: 18,
                        paddingTop: 4,
                        textAlign: "center",
                        backgroundColor: pr.fundo,
                        color: pr.cor,
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                    >
                      {n || ""}
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ marginBottom: 3 }}>
              S · Severidade: gravidade do dano típico do fator (1–5), agravada no setor (+1 cada, até 5) por atestado
              CID-F relacionado ao trabalho, afastamento acima de 15 dias e respondentes expostos (50% ou mais).
            </Text>
            <Text style={{ marginBottom: 3 }}>
              O · Ocorrência: média do Eixo 1 no fator. D · Detecção: medidas de controle do Eixo 2 (1 = eficazes, 5 =
              inexistentes).
            </Text>
            <Text style={{ marginBottom: 3 }}>
              Prioridade: matriz S × O (ao lado, com a quantidade de setor × fator); detecção 4–5 sobe um nível,
              detecção 1 desce um (severidade 5 nunca abaixo de Média). RPN = S × O × D desempata.
            </Text>
            <Text style={s.pequeno}>Prazos contados da emissão deste relatório: {dataLocal(fmea.emitidoEm)}.</Text>
          </View>
        </View>
        <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 4 }}>ACIMA DE 4,00 — PLANO DE AÇÃO NO PGR</Text>
        <TabelaFmeaPdf itens={fmea.pgr} vazio="Nenhum fator acima de 4,00." />
        <Text style={{ fontWeight: 700, color: AZUL, marginTop: 6, marginBottom: 4 }}>DE 3,01 A 4,00 — ACOMPANHAMENTO</Text>
        <TabelaFmeaPdf itens={fmea.acompanhamento} vazio="Nenhum fator entre 3,01 e 4,00." />
      </Page>

      {/* Página 4 — matriz de decisão */}
      <Page size="A4" orientation="landscape" style={s.page}>
        {cab}
        <Secao numero={4} titulo="Matriz de decisão por setor e fator" />
        <View style={{ flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 4, fontWeight: 700, color: "#52525b" }} fixed>
          <Text style={{ width: "14%", paddingHorizontal: 3 }}>Setor</Text>
          <Text style={{ width: "20%", paddingHorizontal: 3 }}>Fator</Text>
          <Text style={{ width: "7%", paddingHorizontal: 3, textAlign: "right" }}>Eixo 1</Text>
          <Text style={{ width: "7%", paddingHorizontal: 3, textAlign: "right" }}>Eixo 2</Text>
          <Text style={{ width: "8%", paddingHorizontal: 3, textAlign: "right" }}>Ajustado</Text>
          <Text style={{ width: "14%", paddingHorizontal: 3 }}>Eixo 3</Text>
          <Text style={{ width: "8%", paddingHorizontal: 3, textAlign: "center" }}>Final</Text>
          <Text style={{ width: "22%", paddingHorizontal: 3 }}>Conclusão / encaminhamento</Text>
        </View>
        {linhas
          .filter((l) => !l.suprimido)
          .flatMap((l) =>
            l.celulas
              .filter((c) => c.final !== null)
              .sort((a, b) => (b.final ?? 0) - (a.final ?? 0))
              .map((c) => (
                <View key={`${l.setorId}-${c.fatorId}`} style={s.linha} wrap={false}>
                  <Text style={{ width: "14%", paddingHorizontal: 3 }}>{l.nome}</Text>
                  <Text style={{ width: "20%", paddingHorizontal: 3 }}>{nomeFator(c.fatorId)}</Text>
                  <Text style={{ width: "7%", paddingHorizontal: 3, textAlign: "right" }}>{formatarRisco(c.eixo1!)}</Text>
                  <Text style={{ width: "7%", paddingHorizontal: 3, textAlign: "right" }}>{c.fatorEixo2.toFixed(2).replace(".", ",")}</Text>
                  <Text style={{ width: "8%", paddingHorizontal: 3, textAlign: "right" }}>{formatarRisco(c.ajustado!)}</Text>
                  <Text style={{ width: "14%", paddingHorizontal: 3 }}>
                    {c.rotuloEixo3}
                    {c.cidsEixo3.length ? ` (${c.cidsEixo3.join(", ")})` : ""}
                  </Text>
                  <View style={{ width: "8%", alignItems: "center" }}>
                    <Text
                      style={{
                        backgroundColor: CONCLUSOES[c.conclusao!].fundo,
                        color: CONCLUSOES[c.conclusao!].cor,
                        fontWeight: 700,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 3,
                      }}
                    >
                      {formatarRisco(c.final!)}
                    </Text>
                  </View>
                  <Text style={{ width: "22%", paddingHorizontal: 3 }}>
                    {CONCLUSOES[c.conclusao!].rotulo} — {CONCLUSOES[c.conclusao!].encaminhamento}
                  </Text>
                </View>
              )),
          )}
      </Page>

      {/* Página 4 — PGR, fontes e metodologia */}
      <Page size="A4" orientation="landscape" style={s.page}>
        {cab}
        <Secao numero={5} titulo="Riscos existentes que vão para o PGR" />
        {pgr.length === 0 ? (
          <Text>Nenhum fator acima de 4,00.</Text>
        ) : (
          pgr.map((r) => (
            <View
              key={`${r.setor}-${r.fator.id}`}
              style={[s.caixa, { borderColor: CONCLUSOES.RISCO_EXISTENTE.cor, borderLeftWidth: 4 }]}
              wrap={false}
            >
              <Text style={{ fontWeight: 700, fontSize: 9.5 }}>
                {r.setor} · {r.fator.nome} — índice {formatarRisco(r.celula.final!)}
                {r.celula.fmea ? ` · prioridade ${PRIORIDADES[r.celula.fmea.prioridade].rotulo}` : ""}
              </Text>
              {r.celula.fmea && r.prazos && (
                <Text style={{ fontSize: 7.5, color: PRIORIDADES[r.celula.fmea.prioridade].cor }}>
                  FMEA: S {r.celula.fmea.s} · O {r.celula.fmea.o} · D {r.celula.fmea.d} · RPN {r.celula.fmea.rpn} —{" "}
                  {textoPrazosOuAcoes(r.prazos, r.acoes)}
                </Text>
              )}
              <Text style={s.pequeno}>Fator de risco PGR: {r.fator.fatorRisco}</Text>
              <Text>Possíveis consequências: {r.apoio.consequencias.join(" ")}</Text>
              <Text>
                CID F compatíveis: {r.apoio.cids.join(", ") || "Não específico"}
                {r.celula.cidsEixo3.length ? ` · registrados e relacionados ao trabalho: ${r.celula.cidsEixo3.join(", ")}` : ""}
              </Text>
              <Text>Observação técnica: {r.apoio.observacoes.join(" ")}</Text>
              <Text>
                {r.planos.length > 0 ? "Plano de ação registrado: " : "Possibilidades de intervenção: "}
                {r.planos.length > 0 ? r.planos.join(" | ") : r.planosSugeridos.join("; ")}
              </Text>
            </View>
          ))
        )}

        <Secao numero={6} titulo="Fontes e metodologia" />
        <View style={s.caixa}>
          <Text>
            Eixo 1 — Percepção dos colaboradores:{" "}
            {opcoes.pesquisa ? `${opcoes.pesquisa.nome} (${data(opcoes.pesquisa.dataInicio)} a ${data(opcoes.pesquisa.dataFim)})` : "não considerado"}
          </Text>
          <Text>Eixo 2 — Medidas de controle: {opcoes.avaliacao ? opcoes.avaliacao.nome : "não considerado (×1,00)"}</Text>
          <Text>
            Eixo 3 — Atestados CID-F:{" "}
            {opcoes.levantamento
              ? `${opcoes.levantamento.nome} (${data(opcoes.levantamento.periodoInicio)} a ${data(opcoes.levantamento.periodoFim)})`
              : "não considerado (×1,00)"}
          </Text>
          {opcoes.levantamento?.declaracaoAceitaEm && (
            <Text style={s.pequeno}>
              Levantamento publicado com declaração de veracidade de {opcoes.levantamento.responsavel ?? "responsável RH/DP"}
              {opcoes.levantamento.cargoResponsavel ? ` (${opcoes.levantamento.cargoResponsavel})` : ""} em{" "}
              {opcoes.levantamento.declaracaoAceitaEm.toLocaleString("pt-BR")}.
            </Text>
          )}
        </View>
        <View style={s.caixa}>
          <Text>
            Risco final = Eixo 1 (média 1–5 por fator e setor) × Fator do Eixo 2 (0,80 eficaz/N.A. · 0,90 precisa
            melhorar · 1,00 inexistente) × Fator do Eixo 3 (×1,10 quando há CID-F relacionado ao trabalho e compatível
            com o fator pela matriz Fatores × CID F). Resultado geral = média dos
            setores avaliados. Setores com menos de {limite} respostas no Eixo 1 não têm score, para proteger o
            anonimato.
          </Text>
        </View>
        <View style={s.caixa}>
          <Text style={{ fontWeight: 700, marginBottom: 3 }}>Orientações técnicas — Eixo 3</Text>
          {ORIENTACOES_EIXO3.slice(4).map((o) => (
            <Text key={o} style={{ marginBottom: 2 }}>
              • {o}
            </Text>
          ))}
        </View>
        <Text style={s.pequeno}>
          Emitido em {dataLocal(fmea.emitidoEm)}. A classificação FMEA prioriza os fatores identificados; não substitui a
          avaliação clínica nem estabelece nexo causal individual.
        </Text>
      </Page>

      {/* Página final — critérios FMEA documentados (NR-1, 1.5.4.4.2) */}
      <Page size="A4" orientation="landscape" style={s.page}>
        {cab}
        <Secao numero={7} titulo="Critérios da classificação FMEA" />
        <Text style={[s.pequeno, { marginBottom: 6 }]}>
          Critérios de severidade, probabilidade (ocorrência) e classificação documentados conforme a NR-1, item
          1.5.4.4.2. Severidade-base validada pelo profissional de SST responsável.
        </Text>
        <View style={{ flexDirection: "row" }}>
          <View style={{ width: "62%", marginRight: 12 }}>
            <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 3 }}>Severidade-base por fator</Text>
            {fmea.severidades.map((sv) => (
              <View key={sv.fator.id} style={s.linha} wrap={false}>
                <Text style={{ width: "30%", paddingRight: 4 }}>{sv.fator.nome}</Text>
                <View style={{ width: "6%", alignItems: "center" }}>
                  {sv.severidade !== null ? <NotaFmea v={sv.severidade} /> : <Text>—</Text>}
                </View>
                <Text style={{ width: "64%", fontSize: 7.5, color: "#3f3f46" }}>
                  {sv.justificativa ? paraPdf(sv.justificativa) : "Sem severidade cadastrada (usa 3)."}
                </Text>
              </View>
            ))}
            <Text style={[s.pequeno, { marginTop: 4 }]}>
              Agravantes no setor (+1 cada, até 5): {ROTULO_AGRAVANTE.ATESTADO}; {ROTULO_AGRAVANTE.AFASTAMENTO_LONGO} (só
              atestado relacionado); {ROTULO_AGRAVANTE.EXPOSTOS}, com média individual 4 ou mais no fator.
            </Text>
          </View>
          <View style={{ width: "38%" }}>
            <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 3 }}>O · Ocorrência (Eixo 1)</Text>
            {FAIXAS_O.map((f, i) => (
              <View key={f} style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <NotaFmea v={i + 1} />
                <Text style={{ marginLeft: 5 }}>média {f}</Text>
              </View>
            ))}
            <Text style={{ fontWeight: 700, color: AZUL, marginTop: 8, marginBottom: 3 }}>D · Detecção e controle (Eixo 2)</Text>
            {FAIXAS_D.map((f, i) => (
              <View key={f} style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <NotaFmea v={i + 1} />
                <Text style={{ marginLeft: 5 }}>{f}</Text>
              </View>
            ))}
            <Text style={{ fontWeight: 700, color: AZUL, marginTop: 8, marginBottom: 3 }}>Prioridade e prazos</Text>
            {(Object.keys(fmea.regrasPrazo) as Prioridade[]).map((pr) => (
              <View key={pr} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <Prio p={pr} />
                <Text style={{ marginLeft: 5, flex: 1 }}>{textoRegraPrazo(fmea.regrasPrazo[pr])}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
