import ExcelJS from "exceljs";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { AcaoCompleta } from "@/lib/plano-acao";
import { PRIORIDADES, type Prioridade } from "@/lib/fmea";
import {
  EFICACIAS,
  FASES,
  SITUACOES,
  formatarDia,
  formatarReais,
  seguroParaPlanilha,
  situacaoDaAcao,
  type Eficacia,
  type Fase,
} from "@/lib/plano-acao-util";

/** Uma linha "achatada" da ação — a mesma para Excel e PDF. */
function linha(a: AcaoCompleta, hoje: string) {
  const fase = FASES[a.fase as Fase];
  return {
    numero: `#${a.numero}`,
    oque: a.oque,
    porque: [a.dimensao?.nome, a.porque].filter(Boolean).join(" — "),
    onde: a.setores.map((s) => s.setor.nome).join(", "),
    quem: [a.responsavel, a.cargoResponsavel].filter(Boolean).join(" · "),
    inicio: formatarDia(a.inicio),
    prazo: formatarDia(a.prazo),
    como: a.como ?? "",
    custo: a.custoCentavos !== null ? a.custoCentavos / 100 : null,
    custoTexto: formatarReais(a.custoCentavos),
    custoObservacao: a.custoObservacao ?? "",
    prioridade: a.prioridade ? PRIORIDADES[a.prioridade as Prioridade].rotulo : "",
    pdca: `${fase.letra} · ${fase.rotulo}${a.fase === "EXECUTAR" ? ` (${a.percentual}%)` : ""}`,
    situacao: SITUACOES[situacaoDaAcao(a, hoje)].rotulo,
    reavaliar: formatarDia(a.reavaliarEm),
    eficacia: a.eficacia ? EFICACIAS[a.eficacia as Eficacia].rotulo : "",
  };
}

export async function gerarPlanoExcel(acoes: AcaoCompleta[], empresa: string, hoje: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma FRPRT";
  const ws = wb.addWorksheet("Plano de ação");
  ws.columns = [
    { header: "Nº", key: "numero", width: 7 },
    { header: "O quê", key: "oque", width: 45 },
    { header: "Por quê (fator)", key: "porque", width: 35 },
    { header: "Onde (setores)", key: "onde", width: 25 },
    { header: "Quem", key: "quem", width: 25 },
    { header: "Início", key: "inicio", width: 12 },
    { header: "Prazo", key: "prazo", width: 12 },
    { header: "Como", key: "como", width: 40 },
    { header: "Quanto (R$)", key: "custo", width: 14 },
    { header: "Obs. do custo", key: "custoObservacao", width: 25 },
    { header: "Prioridade FMEA", key: "prioridade", width: 14 },
    { header: "PDCA", key: "pdca", width: 20 },
    { header: "Situação", key: "situacao", width: 18 },
    { header: "Reavaliar em", key: "reavaliar", width: 13 },
    { header: "Eficácia", key: "eficacia", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  for (const a of acoes) {
    const l = linha(a, hoje);
    const row: Record<string, string | number | null> = {};
    for (const [k, v] of Object.entries(l)) {
      if (k === "custoTexto") continue;
      // Texto livre do usuário nunca vira fórmula ao abrir a planilha.
      row[k] = typeof v === "string" ? seguroParaPlanilha(v) : v;
    }
    ws.addRow(row);
  }
  ws.getColumn("custo").numFmt = '"R$" #,##0.00';
  ws.eachRow((r) => (r.alignment = { vertical: "top", wrapText: true }));
  wb.title = `Plano de ação — ${empresa}`;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** A Helvetica padrão do PDF (WinAnsi) não tem estes símbolos. */
const paraPdf = (t: string) => t.replace(/≈/g, "~").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-").replace(/→/g, "->");

const s = StyleSheet.create({
  page: { padding: 24, fontSize: 8, color: "#18181b" },
  titulo: { fontSize: 15, fontWeight: 700, color: "#183b56" },
  sub: { fontSize: 8.5, color: "#71717a", marginBottom: 10 },
  cab: { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 4, fontWeight: 700, color: "#52525b", fontSize: 7.5 },
  linha: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e4e4e7", paddingVertical: 4 },
});

const COLS = [
  { k: "numero", t: "Nº", w: "4%" },
  { k: "oque", t: "O quê", w: "20%" },
  { k: "porque", t: "Por quê", w: "13%" },
  { k: "onde", t: "Onde", w: "9%" },
  { k: "quem", t: "Quem", w: "10%" },
  { k: "quando", t: "Quando", w: "9%" },
  { k: "como", t: "Como", w: "14%" },
  { k: "custoTexto", t: "Quanto", w: "7%" },
  { k: "prioridade", t: "Prior.", w: "5%" },
  { k: "pdca", t: "PDCA / situação", w: "9%" },
] as const;

export async function gerarPlanoPdf(acoes: AcaoCompleta[], empresa: string, hoje: string): Promise<Buffer> {
  const linhas = acoes.map((a) => linha(a, hoje));
  const total = acoes.reduce((t, a) => t + (a.custoCentavos ?? 0), 0);
  const doc = (
    <Document title={`Plano de ação — ${empresa}`}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.titulo}>Plano de ação · 5W2H e PDCA</Text>
        <Text style={s.sub}>
          {paraPdf(empresa)} · emitido em {hoje.split("-").reverse().join("/")} · {acoes.length} ação(ões) · custo total{" "}
          {formatarReais(total)}
        </Text>
        <View style={s.cab} fixed>
          {COLS.map((c) => (
            <Text key={c.k} style={{ width: c.w, paddingHorizontal: 3 }}>
              {c.t}
            </Text>
          ))}
        </View>
        {linhas.map((l) => (
          <View key={l.numero} style={s.linha} wrap={false}>
            {COLS.map((c) => {
              const valor =
                c.k === "quando"
                  ? `${l.inicio} a ${l.prazo}`
                  : c.k === "pdca"
                    ? `${l.pdca}\n${l.situacao}${l.eficacia ? `\n${l.eficacia}` : ""}`
                    : c.k === "custoTexto"
                      ? `${l.custoTexto}${l.custoObservacao ? `\n${l.custoObservacao}` : ""}`
                      : String(l[c.k]);
              return (
                <Text key={c.k} style={{ width: c.w, paddingHorizontal: 3 }}>
                  {paraPdf(valor)}
                </Text>
              );
            })}
          </View>
        ))}
        <Text style={{ marginTop: 8, fontSize: 7, color: "#71717a" }}>
          PDCA: P planejar · D executar · C verificar a eficácia · A agir (padronizar ou ação corretiva). Prazos e
          responsáveis definidos pela empresa; a prioridade vem da Matriz FMEA do Painel FRPRT.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
