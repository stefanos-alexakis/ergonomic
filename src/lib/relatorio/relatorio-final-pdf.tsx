import { Document, Font, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { Fragment, type ReactNode } from "react";
import { CONCLUSOES, concluir, formatarRisco, posicaoNaRegua, textoEixoSetor } from "@/lib/score-final";
import { OPCOES_ESCALA, type DistribuicaoPesquisa } from "@/lib/distribuicao-respostas";
import { ROTULO_CONDICAO, type Condicao } from "@/lib/eixo2";
import { FASES, formatarReais, type Fase } from "@/lib/plano-acao-util";
import { paraPdf } from "@/lib/relatorio/relatorio-completo-pdf";
import type { DadosRelatorioFinal, PositividadeSetor } from "@/lib/relatorio/relatorio-final";
import type { RelatorioEixo2 } from "@/lib/relatorio/eixo2-relatorio";
import type { LinhaCapitulos } from "@/lib/levantamento-eixo3";
import {
  ASPECTOS_METODOLOGICOS,
  CORRESPONDENCIA,
  CORRESPONDENCIA_INTRO,
  EIXO2_SINTESE,
  IMPLEMENTACAO_INTRO,
  INTRODUCAO,
  LEGISLACAO,
  METODOLOGIA_INTRO,
  MONITORAMENTO,
  NOTA_INTERNA_FMEA,
  OBJETIVO,
  OBSERVACAO_TECNICA,
  PASSOS,
  PLANO_INTRO,
  REFERENCIAS,
  SEM_PGR,
  type BlocoTexto,
} from "@/lib/relatorio/textos-modelo";

/**
 * Relatório final no modelo da cliente (nov/2026) — retrato, com sumário
 * paginado (duas passagens, como o relatório completo). Os textos fixos
 * vêm de textos-modelo.ts; os dados, do sistema.
 *
 * Sem cabeçalho de tabela "fixed" e sem minPresenceAhead: juntos, num
 * documento longo, o @react-pdf calcula uma borda com coordenada inválida
 * ("unsupported number") e a geração falha (achado com 3 setores e a
 * distribuição pergunta a pergunta).
 */

// Hifenização do gerador segue regras do inglês ("Nun-ca", "par-ticipantes"): quebra só entre palavras.
Font.registerHyphenationCallback((palavra) => [palavra]);

const AZUL = "#183b56";
const AZUL_MEDIO = "#1e5a8a";
const TURQUESA = "#1b8aa6";
const CINZA = "#71717a";
const COR_F = "#c0504d";
const COR_Z = "#e08a3c";
const COR_OUTROS = "#4f81bd";

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9.5, color: "#18181b", lineHeight: 1.4 },
  h1: { fontSize: 15, fontWeight: 700, color: AZUL, marginBottom: 10 },
  h2: { fontSize: 11.5, fontWeight: 700, color: AZUL, marginTop: 12, marginBottom: 5 },
  h3: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3 },
  p: { marginBottom: 6, textAlign: "justify" },
  pequeno: { fontSize: 8, color: CINZA },
  item: { flexDirection: "row", marginBottom: 3 },
  tabCab: { flexDirection: "row", backgroundColor: "#e8eef4", fontWeight: 700, color: AZUL },
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
  nota: { borderWidth: 1, borderColor: "#c4b5fd", backgroundColor: "#f5f3ff", padding: 8, borderRadius: 4, marginBottom: 8, fontSize: 8.5 },
  caixa: { borderWidth: 1, borderColor: "#d4d4d8", borderRadius: 4, padding: 8, marginBottom: 8 },
});

const dataBr = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const dataUtc = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

type Paginas = Record<string, number>;

const SECOES = [
  ["responsaveis", "Responsáveis pelo documento"],
  ["objetivo", "1. Objetivo"],
  ["introducao", "2. Introdução"],
  ["legislacao", "3. Legislação"],
  ["metodologia", "4. Metodologia e correspondência entre requisitos legais"],
  ["implementacao", "5. Implementação do trabalho: levantamento dos fatores de risco"],
  ["eixo1", "6. Eixo 01 — Resultados da pesquisa de percepção dos colaboradores"],
  ["eixo2", "7. Eixo 02 — Condições organizacionais e medidas de prevenção"],
  ["eixo3", "8. Eixo 03 — Indicadores de saúde ocupacional"],
  ["cruzamento", "9. Cruzamento analítico dos Eixos 1, 2 e 3 — resultados setoriais"],
  ["plano", "10. Plano de ação"],
  ["conclusao", "11. Conclusão"],
  ["monitoramento", "12. Monitoramento e continuidade das ações"],
  ["anexo1", "Anexo 1 — Resumo dos fatores de risco / PGR"],
  ["anexo2", "Anexo 2 — Assédio e violência no trabalho (Lei nº 14.457/2022)"],
  ["referencias", "Referências bibliográficas / fontes"],
  ["assinaturas", "Assinaturas"],
] as const;
type ChaveSecao = (typeof SECOES)[number][0];

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

function TituloSecao({ chave, paginas }: { chave: ChaveSecao; paginas: Paginas }) {
  return (
    <>
      <Marcador chave={chave} paginas={paginas} />
      <Text style={s.h1}>{paraPdf(SECOES.find(([k]) => k === chave)![1])}</Text>
    </>
  );
}

function Rodape({ empresa, versao }: { empresa: string; versao: number | null }) {
  return (
    <View style={s.rodape} fixed>
      <Text>
        {paraPdf(empresa)} · Relatório FRPRT · {versao ? `versão ${versao}` : "PRÉ-VISUALIZAÇÃO (não emitido)"}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function Tabela({
  colunas,
  linhas,
  larguras,
  destaque,
  fonte,
}: {
  colunas: string[];
  linhas: string[][];
  larguras?: string[];
  destaque?: (i: number) => boolean;
  fonte?: number;
}) {
  const w = (i: number) => larguras?.[i] ?? `${100 / colunas.length}%`;
  return (
    <View style={[{ marginBottom: 8 }, fonte ? { fontSize: fonte } : {}]}>
      <View style={s.tabCab}>
        {colunas.map((c, i) => (
          <Text key={i} style={[s.cel, { width: w(i) }]}>
            {paraPdf(c)}
          </Text>
        ))}
      </View>
      {linhas.map((l, j) => (
        <View key={j} style={[s.tabLinha, destaque?.(j) ? { backgroundColor: "#fee2e2" } : {}]} wrap={false}>
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

/** Texto livre: linha em branco separa parágrafos; "# " vira subtítulo; "- " vira item de lista. */
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

function BlocosTexto({ blocos }: { blocos: BlocoTexto[] }) {
  return (
    <>
      {blocos.map((b, i) => {
        if (b.tipo === "sub") {
          return (
            <Text key={i} style={s.h2}>
              {paraPdf(b.texto)}
            </Text>
          );
        }
        if (b.tipo === "rotulo") {
          return b.texto ? (
            <Text key={i} style={s.p}>
              <Text style={{ fontWeight: 700 }}>{paraPdf(b.rotulo)}: </Text>
              {paraPdf(b.texto)}
            </Text>
          ) : (
            <Text key={i} style={[s.h3]}>
              {paraPdf(b.rotulo)}
            </Text>
          );
        }
        if (b.tipo === "lista") {
          return (
            <View key={i} style={{ marginBottom: 6 }}>
              {b.itens.map((it, j) => (
                <View key={j} style={s.item}>
                  <Text style={{ width: 10 }}>•</Text>
                  <Text style={{ flex: 1 }}>{paraPdf(it)}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (b.tipo === "quadro") {
          return (
            <View key={i} style={[s.caixa, { backgroundColor: "#f0f7fb", borderColor: "#b7d3e6" }]} wrap={false}>
              {b.linhas.map((l, j) => (
                <Text key={j} style={{ marginBottom: 3 }}>
                  <Text style={{ fontWeight: 700 }}>{paraPdf(l.rotulo)}: </Text>
                  {paraPdf(l.texto)}
                </Text>
              ))}
            </View>
          );
        }
        return (
          <Text key={i} style={s.p}>
            {paraPdf(b.texto)}
          </Text>
        );
      })}
    </>
  );
}

function Paragrafos({ textos }: { textos: string[] }) {
  return (
    <>
      {textos.map((t, i) => (
        <Text key={i} style={s.p}>
          {paraPdf(t)}
        </Text>
      ))}
    </>
  );
}

/** Seta para baixo desenhada com uma barra (a fonte do PDF não tem o caractere). */
function Seta() {
  return <View style={{ alignSelf: "center", width: 2, height: 12, backgroundColor: "#64748b", marginVertical: 3 }} />;
}

/** Fluxograma da metodologia (o desenho do modelo da cliente, refeito no PDF). */
function Fluxograma() {
  const eixos: [string, string, string, string][] = [
    ["01", "Percepção dos colaboradores", "35 questões organizadas em 13 dimensões. Identificação da percepção dos trabalhadores por setor.", AZUL],
    ["02", "Empresa e liderança", "Verificação das condições organizacionais, práticas de gestão, medidas preventivas e evidências existentes.", AZUL_MEDIO],
    ["03", "Indicadores de saúde", "Análise de atestados, afastamentos e indicadores de agravos, com leitura técnica e agregada.", TURQUESA],
  ];
  return (
    <View style={{ marginVertical: 8 }} wrap={false}>
      <Text style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: AZUL }}>Fluxo metodológico — Mapeamento dos FRPRT</Text>
      <Text style={{ textAlign: "center", fontSize: 8.5, color: CINZA, marginBottom: 8 }}>
        Identificação, análise integrada, priorização e plano de ação.
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {eixos.map(([n, titulo, texto, cor]) => (
          <View key={n} style={{ width: "32%", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 4 }}>
            <Text style={{ backgroundColor: cor, color: "#ffffff", fontWeight: 700, padding: 5 }}>{`EIXO ${n}`}</Text>
            <View style={{ padding: 6 }}>
              <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 3 }}>{titulo}</Text>
              <Text style={{ fontSize: 8 }}>{texto}</Text>
            </View>
          </View>
        ))}
      </View>
      <Seta />
      <View style={{ backgroundColor: AZUL, borderRadius: 4, padding: 8, marginHorizontal: 40 }}>
        <Text style={{ color: "#ffffff", fontWeight: 700, fontSize: 10.5 }}>Cruzamento técnico dos 3 eixos</Text>
        <Text style={{ color: "#e2e8f0", fontSize: 8.5 }}>
          Integração das informações para identificar fatores existentes, circunstâncias de exposição, grupos envolvidos e consistência dos achados.
        </Text>
      </View>
      <Seta />
      <View style={{ borderWidth: 1, borderColor: "#b7d3e6", backgroundColor: "#f0f7fb", borderRadius: 4, padding: 8, marginHorizontal: 60 }}>
        <Text style={{ fontWeight: 700, color: AZUL, fontSize: 10.5 }}>Classificação e priorização — Matriz FMEA adaptada</Text>
        <Text style={{ fontSize: 8.5 }}>Os fatores identificados são avaliados e priorizados para definição das ações.</Text>
      </View>
      <Seta />
      <View style={{ backgroundColor: "#f1f5f9", borderRadius: 4, padding: 8 }}>
        <Text style={{ textAlign: "center", fontWeight: 700, color: AZUL, marginBottom: 5 }}>Produtos gerados</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {[
            ["Inventário de Riscos", AZUL],
            ["AEP", AZUL_MEDIO],
            ["Plano de Ação", TURQUESA],
          ].map(([t, cor]) => (
            <Text key={t} style={{ width: "32%", backgroundColor: cor, color: "#ffffff", fontWeight: 700, textAlign: "center", padding: 6, borderRadius: 3 }}>
              {t}
            </Text>
          ))}
        </View>
        <Text style={{ textAlign: "center", fontSize: 8, color: CINZA, marginTop: 5 }}>
          Base para o gerenciamento dos riscos psicossociais relacionados ao trabalho.
        </Text>
      </View>
    </View>
  );
}

/** Distribuição pergunta a pergunta (Eixo 1), com destaque em 50% ou mais de expostos. */
function Distribuicao({ d, titulo }: { d: DistribuicaoPesquisa; titulo: string }) {
  return (
    <>
      <Text style={s.h2}>
        {paraPdf(titulo)}
      </Text>
      <Text style={[s.pequeno, { marginBottom: 4 }]}>
        {d.respondentes} respondente(s). Destaque: 50% ou mais dos respondentes em Frequentemente ou Sempre (expostos).
      </Text>
      {d.fatores.map((f) => (
        <View key={f.id} wrap={false}>
          <Text style={[s.h3, { marginTop: 4 }]}>
            {paraPdf(`${f.nome} — índice ${f.indice !== null ? formatarRisco(f.indice) : "—"}`)}
          </Text>
          <Tabela
            colunas={["Pergunta", ...OPCOES_ESCALA.map((o) => o.rotulo), "% expostos"]}
            larguras={["40%", "9%", "10%", "9%", "13%", "9%", "10%"]}
            linhas={f.linhas.map((l) => [
              `${l.pergunta.numero}. ${l.pergunta.texto}`,
              ...OPCOES_ESCALA.map((o) => String(l.contagem[o.valor])),
              pct(l.parcelaExpostos),
            ])}
            destaque={(j) => f.linhas[j]!.destaque}
            fonte={8}
          />
        </View>
      ))}
    </>
  );
}

/** Gráfico de barras horizontais: percentual de positividade por dimensão, num setor. */
function GraficoPositividade({ p }: { p: PositividadeSetor }) {
  return (
    <View style={[s.caixa, { marginBottom: 10 }]} wrap={false}>
      <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 5 }}>{paraPdf(p.setor)}</Text>
      {p.fatores.map((f) => {
        const v = f.percentual ?? 0;
        const cor = v >= 0.7 ? "#16a34a" : v >= 0.5 ? "#eab308" : "#dc2626";
        return (
          <View key={f.nome} style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
            <Text style={{ width: "40%", fontSize: 7.5 }}>{paraPdf(f.nome)}</Text>
            <View style={{ width: "48%", height: 8, backgroundColor: "#f1f5f9" }}>
              <View style={{ width: `${Math.round(v * 100)}%`, height: 8, backgroundColor: cor }} />
            </View>
            <Text style={{ width: "12%", fontSize: 7.5, textAlign: "right" }}>{pct(f.percentual)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Barra empilhada F · Z · outros (Eixo 3). */
function BarraCapitulos({ rotulo, l, maximo }: { rotulo: string; l: { F: number; Z: number; outros: number }; maximo: number }) {
  const total = l.F + l.Z + l.outros;
  const larg = (n: number) => `${maximo ? (n / maximo) * 100 : 0}%`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
      <Text style={{ width: "28%", fontSize: 8 }}>{paraPdf(rotulo)}</Text>
      <View style={{ width: "60%", flexDirection: "row", height: 10 }}>
        {l.F > 0 && <View style={{ width: larg(l.F), backgroundColor: COR_F }} />}
        {l.Z > 0 && <View style={{ width: larg(l.Z), backgroundColor: COR_Z }} />}
        {l.outros > 0 && <View style={{ width: larg(l.outros), backgroundColor: COR_OUTROS }} />}
      </View>
      <Text style={{ width: "12%", fontSize: 8, textAlign: "right" }}>{total}</Text>
    </View>
  );
}

function Legenda() {
  return (
    <View style={{ flexDirection: "row", marginTop: 3 }}>
      {[
        ["CID F", COR_F],
        ["CID Z", COR_Z],
        ["Outros CIDs (só contagem)", COR_OUTROS],
      ].map(([t, cor]) => (
        <View key={t} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
          <View style={{ width: 8, height: 8, backgroundColor: cor, marginRight: 3 }} />
          <Text style={{ fontSize: 7.5 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** Painel de atestados por ano (CID F × Z × outros, por setor) e comparativo entre anos. */
function PaineisAtestados({ linhas }: { linhas: LinhaCapitulos[] }) {
  const anos = [...new Set(linhas.map((l) => l.ano))].sort((a, b) => (a ?? 0) - (b ?? 0));
  const soma = (xs: LinhaCapitulos[]) => xs.reduce((a, l) => ({ F: a.F + l.F, Z: a.Z + l.Z, outros: a.outros + l.outros }), { F: 0, Z: 0, outros: 0 });
  return (
    <>
      {anos.map((ano) => {
        const doAno = linhas.filter((l) => l.ano === ano);
        const t = soma(doAno);
        const total = t.F + t.Z + t.outros;
        const maximo = Math.max(...doAno.map((l) => l.F + l.Z + l.outros), 1);
        return (
          <View key={String(ano)} style={[s.caixa, { marginTop: 6 }]} wrap={false}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: AZUL }}>
              {`Painel de atestados — ${ano ?? "sem data de início"}`}
            </Text>
            <Text style={[s.pequeno, { marginBottom: 5 }]}>Comparativo de CID F e Z × outros CIDs por setor.</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              {[
                ["CID F", t.F],
                ["CID Z", t.Z],
                ["Outros CIDs", t.outros],
                ["Total", total],
              ].map(([r, v]) => (
                <View key={String(r)} style={{ width: "23%", backgroundColor: "#f8fafc", padding: 5 }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: AZUL }}>{r}</Text>
                  <Text style={{ fontSize: 15, fontWeight: 700, color: AZUL_MEDIO }}>{String(v)}</Text>
                </View>
              ))}
            </View>
            <Text style={[s.pequeno, { marginBottom: 4 }]}>
              {total ? `${Math.round(((t.F + t.Z) / total) * 100)}% dos atestados correspondem a CID F ou Z.` : "Sem atestados no ano."}
            </Text>
            {doAno.map((l) => (
              <BarraCapitulos key={l.setor} rotulo={l.setor} l={l} maximo={maximo} />
            ))}
            <Legenda />
          </View>
        );
      })}
      {anos.length > 1 && (
        <View style={[s.caixa, { marginTop: 6 }]} wrap={false}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: AZUL, marginBottom: 5 }}>Comparativo entre anos</Text>
          {(() => {
            const porAno = anos.map((ano) => ({ ano, ...soma(linhas.filter((l) => l.ano === ano)) }));
            const maximo = Math.max(...porAno.map((a) => a.F + a.Z + a.outros), 1);
            return porAno.map((a) => <BarraCapitulos key={String(a.ano)} rotulo={String(a.ano ?? "sem data")} l={a} maximo={maximo} />);
          })()}
          <Legenda />
        </View>
      )}
    </>
  );
}

type LevantamentoResumo = {
  nome: string;
  periodoInicio: Date;
  periodoFim: Date;
  responsavel: string | null;
  declaracaoAceitaEm: Date | null;
};

/** Seção do Eixo 3: painéis de atestados por ano e indicadores por setor. */
function Eixo3({
  levantamento,
  eixo3,
  totalFatores,
}: {
  levantamento: LevantamentoResumo;
  eixo3: NonNullable<DadosRelatorioFinal["eixo3"]>;
  totalFatores: number;
}) {
  return (
    <>
      <Text style={s.p}>
        {paraPdf(
          `${levantamento.nome} — período de ${dataUtc(levantamento.periodoInicio)} a ${dataUtc(levantamento.periodoFim)}. Atestados e afastamentos dos grupos F e Z da CID, por setor, com a relação com o trabalho informada pelo RH; os de outros grupos entram só na contagem. Dados agregados, sem identificação de trabalhador.`,
        )}
        {levantamento.declaracaoAceitaEm
          ? paraPdf(` Publicado com declaração de veracidade de ${levantamento.responsavel ?? "responsável RH/DP"} em ${dataBr(levantamento.declaracaoAceitaEm)}.`)
          : ""}
      </Text>
      <PaineisAtestados linhas={eixo3.porCapitulo} />
      <Text style={s.h2}>Indicadores por setor (CID F e Z)</Text>
      <Tabela
        colunas={["Setor", "Atestados", "Colab. com atestado", "Relacionados (colab.)", "Parcialmente relac. (colab.)", "Dias afastados", "Fatores agravados"]}
        larguras={["22%", "11%", "13%", "14%", "15%", "12%", "13%"]}
        linhas={eixo3.setores.map((x) => [
          x.nome,
          String(x.ocorrencias),
          String(x.colaboradoresComAtestado),
          String(x.colaboradoresRelacionados),
          String(x.colaboradoresInconclusivos),
          String(x.diasAfastados),
          `${[...x.fatorPorFator.values()].filter((v) => v > 1).length} de ${totalFatores}`,
        ])}
      />
      <Text style={s.pequeno}>
        CID ou afastamento isolado não caracteriza automaticamente doença relacionada ao trabalho: o Eixo 3 é indicador
        agravante coletivo. Só atestados relacionados ao trabalho, com CID compatível com o fator, agravam o índice (×1,10).
      </Text>
    </>
  );
}

function ResultadoGeral({ d }: { d: DadosRelatorioFinal }) {
  const g = d.painel.geral;
  if (!g) return <Text style={s.aviso}>Sem setores com amostra suficiente para calcular o resultado geral.</Text>;
  const c = CONCLUSOES[g.conclusao];
  return (
    <View style={{ borderWidth: 2, borderColor: c.cor, backgroundColor: c.fundo, borderRadius: 6, padding: 12, marginBottom: 10 }} wrap={false}>
      <Text style={{ fontSize: 9, fontWeight: 700, color: CINZA }}>RESULTADO GERAL DA EMPRESA</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
        <Text style={{ fontSize: 30, fontWeight: 700, color: c.cor, marginRight: 12, lineHeight: 1.1 }}>{formatarRisco(g.final)}</Text>
        <View>
          <Text style={{ fontSize: 12, fontWeight: 700, color: c.cor }}>{paraPdf(c.rotulo)}</Text>
          <Text style={{ fontSize: 8.5 }}>{paraPdf(c.curto)} · escala de 1 a 5</Text>
        </View>
      </View>
      <Text style={{ marginTop: 8 }}>{paraPdf(c.descricao)}</Text>
      <View style={{ flexDirection: "row", height: 7, marginTop: 8 }}>
        <View style={{ width: "50%", backgroundColor: "#6ee7b7" }} />
        <View style={{ width: "25%", backgroundColor: "#fcd34d" }} />
        <View style={{ width: "25%", backgroundColor: "#f87171" }} />
      </View>
      <View style={{ position: "relative", height: 8 }}>
        <View style={{ position: "absolute", left: `${posicaoNaRegua(g.final)}%`, top: -10, width: 3, height: 12, backgroundColor: "#18181b" }} />
      </View>
      <View style={{ position: "relative", height: 10, fontSize: 7.5, color: CINZA }}>
        {[
          ["1", 0],
          ["3", 50],
          ["4", 75],
          ["5", 97],
        ].map(([t, x]) => (
          <Text key={String(t)} style={{ position: "absolute", left: `${x}%` }}>
            {t}
          </Text>
        ))}
      </View>
      <Text style={[s.pequeno, { marginTop: 6 }]}>
        {`${g.setoresAvaliados} setor(es) avaliado(s) · ${g.setoresEmRisco} com índice alto · ${g.fatoresPgr} situação(ões) no PGR · participação ${pct(g.participacao)}. O resultado geral é a média dos setores; cada setor é a média dos 13 fatores. Situações isoladas podem ficar acima de 3,00 (e ir para o PGR) mesmo com resultado geral baixo.`}
      </Text>
    </View>
  );
}

/** "Como chegamos ao resultado": os 13 fatores do setor, com a conta à mão. */
function ComoChegamos({ d }: { d: DadosRelatorioFinal }) {
  const { fatores, linhas } = d.painel;
  return (
    <>
      {linhas
        .filter((l) => l.final !== null)
        .map((l) => (
          <View key={l.setorId} style={{ marginBottom: 8 }} wrap={false}>
            <Text style={s.h3}>{paraPdf(l.nome)}</Text>
            <Tabela
              colunas={["Fator", "Eixo 1", "× Eixo 2", "× Eixo 3", "= Índice", "Classificação"]}
              larguras={["38%", "11%", "11%", "11%", "11%", "18%"]}
              linhas={[
                ...l.celulas
                  .filter((c) => c.final !== null)
                  .map((c) => [
                    fatores.find((f) => f.id === c.fatorId)?.nome ?? "",
                    formatarRisco(c.eixo1!),
                    formatarRisco(c.fatorEixo2),
                    formatarRisco(c.fatorEixo3),
                    formatarRisco(c.final!),
                    CONCLUSOES[c.conclusao!].curto,
                  ]),
                ["Resultado do setor (média dos fatores)", formatarRisco(l.eixo1!), "", "", formatarRisco(l.final!), CONCLUSOES[l.conclusao!].curto],
              ]}
            />
          </View>
        ))}
    </>
  );
}

function PlanoVertical({ d }: { d: DadosRelatorioFinal }) {
  if (d.acoes.length === 0) return <Text style={s.aviso}>Nenhuma ação cadastrada no plano de ação.</Text>;
  const campo = (rotulo: string, valor: string | null | undefined) => (
    <Text style={{ marginBottom: 2 }}>
      <Text style={{ fontWeight: 700 }}>{rotulo}: </Text>
      {paraPdf(valor?.trim() ? valor : "—")}
    </Text>
  );
  return (
    <>
      {d.acoes.map((a) => (
        <View key={a.id} style={[s.caixa, { borderRadius: 0, borderLeftWidth: 3, borderLeftColor: AZUL }]} wrap={false}>
          <Text style={{ fontWeight: 700, color: AZUL, marginBottom: 3 }}>{paraPdf(`#${a.numero} · ${a.oque}`)}</Text>
          {campo("Por quê", a.porque)}
          {campo("Fator", a.dimensao?.nome)}
          {campo("Onde (setores)", a.setores.map((x) => x.setor.nome).join(", "))}
          {campo("Quem", [a.responsavel, a.cargoResponsavel].filter(Boolean).join(" — "))}
          {campo("Quando", `${a.inicio ? dataUtc(a.inicio) : "—"} a ${a.prazo ? dataUtc(a.prazo) : "—"}`)}
          {campo("Como", a.como)}
          {campo("Quanto", a.custoCentavos !== null ? formatarReais(a.custoCentavos) : null)}
          {campo("Situação (PDCA)", FASES[a.fase as Fase]?.rotulo ?? a.fase)}
        </View>
      ))}
      <Text style={s.pequeno}>
        PDCA: P planejar · D executar · C verificar a eficácia · A agir (padronizar ou ação corretiva). Prazos e responsáveis definidos pela empresa.
      </Text>
    </>
  );
}

function Eixo2({ r, resumo, observacao }: { r: RelatorioEixo2; resumo: string; observacao: string }) {
  const ordem: Condicao[] = ["EFICAZ", "PRECISA_MELHORAR", "INEXISTENTE", "NAO_SE_APLICA"];
  return (
    <>
      <Text style={s.h2}>Entrevistas com grupo focal e lideranças</Text>
      <Text style={s.h3}>Síntese metodológica</Text>
      <Text style={s.p}>{paraPdf(EIXO2_SINTESE)}</Text>
      <Text style={s.h3}>Resumo executivo</Text>
      <TextoLivre texto={resumo} />
      <Text style={s.h3}>
        Quadro consolidado por dimensão
      </Text>
      <Tabela
        colunas={["Dimensão", ...ordem.map((c) => ROTULO_CONDICAO[c])]}
        larguras={["36%", "16%", "16%", "16%", "16%"]}
        linhas={r.dimensoes.map((dim) => [dim.nome, ...ordem.map((c) => String(dim.contagem[c]))])}
      />
      {r.frentes.length > 0 && (
        <>
          <Text style={s.h3}>
            Frentes de ação (planos registrados, consolidados)
          </Text>
          <Tabela
            colunas={["Dimensão", "Plano de ação", "Setores"]}
            larguras={["24%", "48%", "28%"]}
            linhas={r.frentes.map((f) => [f.dimensao, f.plano, f.setores.join(", ")])}
          />
        </>
      )}
      <Text style={s.h3}>Observação interpretativa</Text>
      <TextoLivre texto={observacao || "—"} />
      <Text style={s.h2} break>
        Perguntas e respostas por setor
      </Text>
      {r.dimensoes.map((dim) => (
        <View key={dim.nome}>
          <Text style={s.h3}>
            {paraPdf(dim.nome)}
          </Text>
          <Tabela
            colunas={["Medida avaliada", "Setor", "Resposta", "Justificativa / plano de ação"]}
            larguras={["34%", "16%", "18%", "32%"]}
            linhas={dim.questoes.flatMap((q) =>
              q.respostas.map((x, i) => [
                i === 0 ? q.texto : "",
                x.setor,
                ROTULO_CONDICAO[x.condicao],
                [x.justificativa, x.plano ? `Plano: ${x.plano}` : null].filter(Boolean).join(" · "),
              ]),
            )}
          />
        </View>
      ))}
    </>
  );
}

function Documento({ d, paginas }: { d: DadosRelatorioFinal; paginas: Paginas }) {
  const { painel } = d;
  const { opcoes } = painel;
  const logo = d.logo ? `data:image/${d.logo.formato};base64,${d.logo.buffer.toString("base64")}` : undefined;
  const rodape = <Rodape empresa={d.empresa} versao={d.versao} />;
  const pagina = (filhos: ReactNode) => (
    <Page size="A4" style={s.page}>
      {rodape}
      {filhos}
    </Page>
  );

  return (
    <Document title={`Relatório FRPRT — ${d.empresa}`} author="Plataforma FRPRT">
      {/* Capa */}
      <Page size="A4" style={[s.page, { justifyContent: "space-between" }]}>
        <View>
          {logo ? <Image src={logo} style={{ maxHeight: 70, maxWidth: 220, objectFit: "contain", marginBottom: 30 }} /> : null}
          <Text style={{ fontSize: 11, color: CINZA, marginBottom: 6 }}>RELATÓRIO FINAL</Text>
          <Text style={{ fontSize: 22, fontWeight: 700, color: AZUL, lineHeight: 1.25 }}>
            Avaliação dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT)
          </Text>
          <Text style={{ fontSize: 15, marginTop: 18, fontWeight: 700 }}>{paraPdf(d.empresa)}</Text>
        </View>
        <View style={{ borderTopWidth: 2, borderTopColor: AZUL, paddingTop: 10 }}>
          <Text>
            Eixo 1 · Pesquisa:{" "}
            {opcoes.pesquisa
              ? paraPdf(`${opcoes.pesquisa.nome} (${dataUtc(opcoes.pesquisa.dataInicio)} a ${dataUtc(opcoes.pesquisa.dataFim)})`)
              : "não considerada"}
          </Text>
          <Text>Eixo 2 · Avaliação: {opcoes.avaliacao ? paraPdf(opcoes.avaliacao.nome) : "não considerada (×1,00)"}</Text>
          <Text>
            Eixo 3 · Levantamento:{" "}
            {opcoes.levantamento
              ? paraPdf(`${opcoes.levantamento.nome} (${dataUtc(opcoes.levantamento.periodoInicio)} a ${dataUtc(opcoes.levantamento.periodoFim)})`)
              : "não considerado (×1,00)"}
          </Text>
          <Text style={{ marginTop: 8, fontWeight: 700 }}>
            {d.versao ? `Versão ${d.versao} · emitida em ${dataBr(d.emissao)}` : `Pré-visualização de ${dataBr(d.emissao)} — documento não emitido`}
          </Text>
        </View>
      </Page>

      {/* Responsáveis pelo documento */}
      {pagina(
        <>
          <TituloSecao chave="responsaveis" paginas={paginas} />
          <Text style={[s.p, { color: CINZA }]}>
            Responsáveis técnicos e institucionais envolvidos na elaboração, validação e acompanhamento deste dossiê.
          </Text>
          {d.responsaveis.length === 0 ? (
            <Text style={s.aviso}>Nenhum responsável marcado no cadastro da empresa (Editar empresa → Responsáveis do relatório).</Text>
          ) : (
            <Tabela
              colunas={["Área / Função", "Responsável", "Empresa / Contato"]}
              larguras={["26%", "40%", "34%"]}
              linhas={d.responsaveis.map((r) => [
                r.areaFuncao,
                [r.nome, r.especialidade, r.descritivo].filter(Boolean).join("\n"),
                [r.empresa, r.email, r.celular].filter(Boolean).join("\n"),
              ])}
            />
          )}
        </>,
      )}

      {/* Sumário */}
      {pagina(
        <>
          <Text style={s.h1}>Sumário</Text>
          {SECOES.map(([k, titulo]) => (
            <View
              key={k}
              style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f4f4f5", paddingVertical: 5 }}
            >
              <Text>{paraPdf(titulo)}</Text>
              <Text>{paginas[k] ?? ""}</Text>
            </View>
          ))}
        </>,
      )}

      {/* 1–2. Objetivo e introdução */}
      {pagina(
        <>
          <TituloSecao chave="objetivo" paginas={paginas} />
          <Paragrafos textos={OBJETIVO} />
          <View style={{ height: 10 }} />
          <TituloSecao chave="introducao" paginas={paginas} />
          <Paragrafos textos={INTRODUCAO} />
        </>,
      )}

      {/* 3. Legislação */}
      {pagina(
        <>
          <TituloSecao chave="legislacao" paginas={paginas} />
          <BlocosTexto blocos={LEGISLACAO} />
        </>,
      )}

      {/* 4. Metodologia */}
      {pagina(
        <>
          <TituloSecao chave="metodologia" paginas={paginas} />
          <Text style={s.p}>{paraPdf(METODOLOGIA_INTRO)}</Text>
          <Fluxograma />
          <Text style={s.h2}>
            Complementos fundamentais para fortalecer a comprovação da metodologia
          </Text>
          <Text style={[s.p, { color: CINZA }]}>
            Aspectos técnicos, limites de interpretação e cuidados recomendados para o relatório e para a gestão das evidências.
          </Text>
          <Tabela colunas={["Aspecto", "Fundamentação e esclarecimento metodológico"]} larguras={["28%", "72%"]} linhas={ASPECTOS_METODOLOGICOS} />
          {d.versao === null && <Text style={s.nota}>{paraPdf(NOTA_INTERNA_FMEA)}</Text>}
          <Text style={s.h2}>
            Correspondência entre requisitos legais e metodologia FRPRT
          </Text>
          <Text style={s.p}>{paraPdf(CORRESPONDENCIA_INTRO)}</Text>
          <Tabela
            colunas={["Referência normativa", "Exigência ou orientação", "Onde nossa metodologia atende"]}
            larguras={["22%", "34%", "44%"]}
            linhas={CORRESPONDENCIA}
          />
        </>,
      )}

      {/* 5. Implementação */}
      {pagina(
        <>
          <TituloSecao chave="implementacao" paginas={paginas} />
          <Text style={s.p}>{paraPdf(IMPLEMENTACAO_INTRO)}</Text>
          {PASSOS.map((p) => (
            <View key={p.titulo}>
              <Text style={s.h3}>
                {p.titulo.toLocaleUpperCase("pt-BR")}
              </Text>
              <Paragrafos textos={p.paragrafos} />
            </View>
          ))}
        </>,
      )}

      {/* 6. Eixo 01 */}
      {pagina(
        <>
          <TituloSecao chave="eixo1" paginas={paginas} />
          {!d.eixo1 ? (
            <Text style={s.aviso}>
              {opcoes.pesquisa
                ? "A pesquisa ainda não tem respostas concluídas suficientes para exibir resultados com segurança."
                : "Nenhuma pesquisa do Eixo 1 considerada."}
            </Text>
          ) : (
            <>
              <View style={[s.caixa, { flexDirection: "row", justifyContent: "space-around" }]}>
                <Text>
                  <Text style={{ fontWeight: 700 }}>Total informado: </Text>
                  {d.eixo1.todos.total} respondentes
                </Text>
                <Text>
                  <Text style={{ fontWeight: 700 }}>{d.eixo1.todos.setores.length}</Text> grupos setoriais
                  {d.eixo1.todos.setores.some((x) => x.suprimido) ? " (alguns sem amostra suficiente)" : ""}
                </Text>
              </View>
              <Text style={s.h2}>Percentual de positividade por setor</Text>
              <Text style={[s.pequeno, { marginBottom: 6 }]}>
                Percentual de respostas favoráveis em cada dimensão: Não/Nunca ou Raramente nas perguntas negativas; Frequentemente
                ou Sempre nas positivas. Quanto maior, melhor. Verde a partir de 70%, amarelo de 50% a 69%, vermelho abaixo de 50%.
              </Text>
              {d.eixo1.positividade.map((p) => (
                <GraficoPositividade key={p.setor} p={p} />
              ))}
              {d.eixo1.todos.setores.some((x) => x.suprimido) && (
                <Text style={s.pequeno}>
                  Setores com menos respostas que o mínimo da pesquisa não aparecem separados, para proteger o anonimato; as respostas
                  deles entram em &quot;todos os setores&quot;.
                </Text>
              )}
            </>
          )}
        </>,
      )}
      {/* Distribuição pergunta a pergunta: cada uma em página própria (todos os setores e cada setor). */}
      {d.eixo1 && pagina(<Distribuicao d={d.eixo1.todos} titulo="Distribuição das respostas — todos os setores" />)}
      {d.eixo1?.porSetor.map((x) => (
        <Fragment key={x.setorSelecionado!.id}>
          {pagina(<Distribuicao d={x} titulo={`Distribuição das respostas — ${x.setorSelecionado!.nome}`} />)}
        </Fragment>
      ))}

      {/* 7. Eixo 02 */}
      {pagina(
        <>
          <TituloSecao chave="eixo2" paginas={paginas} />
          {d.eixo2Relatorio ? <Eixo2 r={d.eixo2Relatorio} resumo={d.textos.resumoEixo2} observacao={d.textos.observacaoEixo2} /> : <Text style={s.aviso}>Nenhuma avaliação do Eixo 2 considerada (×1,00).</Text>}
        </>,
      )}

      {/* 8. Eixo 03 */}
      {pagina(
        <>
          <TituloSecao chave="eixo3" paginas={paginas} />
          {!d.eixo3 || !opcoes.levantamento ? (
            <Text style={s.aviso}>Nenhum levantamento do Eixo 3 considerado: todos os fatores entram como ×1,00.</Text>
          ) : (
            <Eixo3 levantamento={opcoes.levantamento} eixo3={d.eixo3} totalFatores={painel.fatores.length} />
          )}
        </>,
      )}

      {/* 9. Cruzamento */}
      {pagina(
        <>
          <TituloSecao chave="cruzamento" paginas={paginas} />
          {d.textos.cruzamentoAnalitico ? (
            <TextoLivre texto={d.textos.cruzamentoAnalitico} />
          ) : d.versao === null ? (
            <Text style={s.aviso}>Texto do cruzamento analítico ainda não redigido pelo consultor.</Text>
          ) : null}
          <Text style={s.h2}>Síntese dos resultados</Text>
          {painel.achados.map((a, i) => (
            <View key={i} style={s.item}>
              <Text style={{ width: 10 }}>•</Text>
              <Text style={{ flex: 1 }}>{paraPdf(a.texto)}</Text>
            </View>
          ))}
          <Text style={s.h2}>
            Resultado geral da empresa
          </Text>
          <ResultadoGeral d={d} />
          <Text style={s.h2}>
            Resultados setoriais
          </Text>
          <Tabela
            colunas={["Setor", "Eixo 1", "Eixo 2", "Eixo 3", "Índice final"]}
            larguras={["28%", "12%", "22%", "22%", "16%"]}
            linhas={painel.linhas.map((l) =>
              l.suprimido || l.final === null
                ? [l.nome, "—", "amostra insuficiente", "", "—"]
                : [
                    l.nome,
                    formatarRisco(l.eixo1!),
                    textoEixoSetor(l.fatorEixo2, l.efeitoEixo2),
                    textoEixoSetor(l.fatorEixo3, l.efeitoEixo3),
                    `${formatarRisco(l.final)} · ${CONCLUSOES[l.conclusao!].curto}`,
                  ],
            )}
          />
          <Text style={s.pequeno}>
            Índice final = Eixo 1 × Eixo 2 × Eixo 3, calculado em cada fator com valores de 2 casas; o resultado do setor é a média
            dos fatores. Eixos 2 e 3: multiplicador médio do setor e, entre parênteses, quanto moveram o Eixo 1 em pontos.
          </Text>
          <Text style={s.h2} break>
            Como chegamos ao resultado de cada setor
          </Text>
          <ComoChegamos d={d} />
        </>,
      )}

      {/* 10. Plano de ação */}
      {pagina(
        <>
          <TituloSecao chave="plano" paginas={paginas} />
          <Text style={s.p}>{paraPdf(PLANO_INTRO)}</Text>
          <PlanoVertical d={d} />
        </>,
      )}

      {/* 11–12. Conclusão e monitoramento */}
      {pagina(
        <>
          <TituloSecao chave="conclusao" paginas={paginas} />
          {d.conclusao ? <TextoLivre texto={d.conclusao} /> : <Text style={s.aviso}>Conclusão ainda não redigida pelo consultor.</Text>}
          <View style={{ height: 10 }} />
          <TituloSecao chave="monitoramento" paginas={paginas} />
          <Paragrafos textos={MONITORAMENTO} />
        </>,
      )}

      {/* Anexo 1 — PGR */}
      {pagina(
        <>
          <TituloSecao chave="anexo1" paginas={paginas} />
          {painel.pgr.length === 0 ? (
            <Text style={s.p}>{paraPdf(SEM_PGR)}</Text>
          ) : (
            painel.pgr.map((r) => (
              <View key={`${r.setorId}|${r.situacao.perguntaId}`} style={s.caixa} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: 700, color: AZUL, width: "80%" }}>
                    {paraPdf(`${r.setor} · ${r.situacao.numero}. ${r.situacao.texto}`)}
                  </Text>
                  <Text
                    style={{
                      fontWeight: 700,
                      color: CONCLUSOES[r.celula.conclusao!].cor,
                      backgroundColor: CONCLUSOES[r.celula.conclusao!].fundo,
                      paddingHorizontal: 5,
                    }}
                  >
                    {formatarRisco(r.celula.final!)}
                  </Text>
                </View>
                {r.celula.fmea && (
                  <Text style={s.pequeno}>
                    {`FMEA: S ${r.celula.fmea.s} · O ${r.celula.fmea.o} · D ${r.celula.fmea.d} · RPN ${r.celula.fmea.rpn} · prioridade ${r.celula.fmea.prioridade.toLocaleLowerCase("pt-BR")} · plano até ${r.prazos.plano ? dataUtc(r.prazos.plano) : "—"} · reavaliar em ${dataUtc(r.prazos.reavaliacao)}`}
                  </Text>
                )}
                <Text style={{ marginTop: 3 }}>
                  {paraPdf(
                    `${r.fator.nome} · Fator de risco PGR: ${r.fator.fatorRisco} · Eixo 1 ${formatarRisco(r.celula.eixo1!)} × Eixo 2 ${formatarRisco(r.celula.fatorEixo2)} × Eixo 3 ${formatarRisco(r.celula.fatorEixo3)}`,
                  )}
                </Text>
                <Text style={{ marginTop: 3 }}>
                  <Text style={{ fontWeight: 700 }}>Possíveis consequências: </Text>
                  {paraPdf(r.apoio.consequencias.join(" "))}
                </Text>
                <Text>
                  <Text style={{ fontWeight: 700 }}>CIDs compatíveis (matriz F e Z): </Text>
                  {paraPdf(r.apoio.cids.join(", ") || "Não específico")}
                </Text>
                <Text>
                  <Text style={{ fontWeight: 700 }}>Observação técnica: </Text>
                  {paraPdf(r.apoio.observacoes.join(" "))}
                </Text>
                {(r.planos.length > 0 || r.planosSugeridos.length > 0) && (
                  <Text>
                    <Text style={{ fontWeight: 700 }}>Possibilidades de intervenção: </Text>
                    {paraPdf([...r.planos, ...r.planosSugeridos].slice(0, 4).join(" · "))}
                  </Text>
                )}
              </View>
            ))
          )}
        </>,
      )}

      {/* Anexo 2 — Assédio e violência */}
      {pagina(
        <>
          <TituloSecao chave="anexo2" paginas={paginas} />
          <Text style={s.p}>
            Termômetro organizacional do fator 11 (Violência no Trabalho), que reúne as perguntas sobre violência por terceiros e
            assédio. Por decisão metodológica, esses indicadores não recebem pontuação pela matriz FMEA. Quando indicarem exposição,
            cabe à organização avaliar no GRO/PGR, independentemente do fluxo de denúncias.
          </Text>
          {painel.violencia.length === 0 ? (
            <Text style={s.aviso}>Sem setores com amostra suficiente para este indicador.</Text>
          ) : (
            <Tabela
              colunas={["Setor", "Índice do fator 11", "Respondentes expostos", "Situações (Eixo 1)"]}
              larguras={["22%", "16%", "16%", "46%"]}
              linhas={painel.violencia.map((v) => [
                v.setor,
                `${formatarRisco(v.final)} · ${CONCLUSOES[concluir(v.final)].curto}`,
                pct(v.parcelaExpostos),
                v.situacoes.map((x) => `${x.numero}. ${x.texto}: ${formatarRisco(x.eixo1)}${x.expostos !== null ? ` (${pct(x.expostos)} expostos)` : ""}`).join("\n"),
              ])}
            />
          )}
        </>,
      )}

      {/* Referências */}
      {pagina(
        <>
          <TituloSecao chave="referencias" paginas={paginas} />
          {REFERENCIAS.map((g) => (
            <View key={g.grupo}>
              <Text style={s.h3}>
                {paraPdf(g.grupo)}
              </Text>
              {g.itens.map((it, i) => (
                <Text key={i} style={[s.p, { fontSize: 8.5 }]}>
                  {paraPdf(it)}
                </Text>
              ))}
            </View>
          ))}
          <Text style={s.h3}>
            Documentos internos e fontes primárias da avaliação
          </Text>
          <TextoLivre texto={d.textos.fontesInternas} />
          <Text style={s.h3}>
            Observação técnica
          </Text>
          <Paragrafos textos={OBSERVACAO_TECNICA} />
        </>,
      )}

      {/* Assinaturas */}
      {pagina(
        <>
          <TituloSecao chave="assinaturas" paginas={paginas} />
          {d.responsaveis.length === 0 ? (
            <Text style={s.aviso}>Nenhum responsável marcado para assinar.</Text>
          ) : (
            d.responsaveis.map((r, i) => (
              <View key={i} style={{ marginTop: 30 }} wrap={false}>
                <View style={{ borderTopWidth: 1, borderTopColor: "#18181b", width: 260, marginBottom: 4 }} />
                <Text style={{ fontWeight: 700 }}>{paraPdf(r.nome)}</Text>
                <Text>{paraPdf(r.areaFuncao)}</Text>
                {r.especialidade && <Text>{paraPdf(r.especialidade)}</Text>}
                {r.empresa && <Text style={s.pequeno}>{paraPdf(r.empresa)}</Text>}
              </View>
            ))
          )}
          <Text style={[s.pequeno, { marginTop: 30 }]}>
            Documento assinado digitalmente após a emissão. {d.versao ? `Versão ${d.versao}, emitida em ${dataBr(d.emissao)}.` : ""}
          </Text>
        </>,
      )}
    </Document>
  );
}

/** Gera o PDF em duas passagens (a 1ª só descobre as páginas do sumário). */
export async function gerarRelatorioFinalPdf(d: DadosRelatorioFinal): Promise<Buffer> {
  const paginas: Paginas = {};
  await renderToBuffer(<Documento d={d} paginas={paginas} />);
  const fixas = { ...paginas };
  return renderToBuffer(<Documento d={d} paginas={fixas} />);
}

/** Página avulsa simples (relatórios do Eixo 2 e do Eixo 3, fora do relatório final). */
function DocumentoAvulso({ titulo, empresa, filhos }: { titulo: string; empresa: string; filhos: ReactNode }) {
  return (
    <Document title={`${titulo} — ${empresa}`} author="Plataforma FRPRT">
      <Page size="A4" style={s.page}>
        <View style={s.rodape} fixed>
          <Text>
            {paraPdf(empresa)} · {paraPdf(titulo)} · gerado em {dataBr(new Date())}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
        <Text style={{ fontSize: 9, color: CINZA }}>{paraPdf(empresa.toLocaleUpperCase("pt-BR"))}</Text>
        <Text style={s.h1}>{paraPdf(titulo)}</Text>
        {filhos}
      </Page>
    </Document>
  );
}

/** Relatório avulso do Eixo 2: perguntas, respostas por setor, planos e textos gerados pelo sistema. */
export function gerarRelatorioEixo2Pdf(p: { empresa: string; relatorio: RelatorioEixo2; resumo: string; observacao: string }): Promise<Buffer> {
  return renderToBuffer(
    <DocumentoAvulso
      titulo={`Eixo 02 — ${p.relatorio.nome}`}
      empresa={p.empresa}
      filhos={<Eixo2 r={p.relatorio} resumo={p.resumo} observacao={p.observacao} />}
    />,
  );
}

/** Relatório avulso do Eixo 3: painéis de atestados por ano e indicadores por setor. */
export function gerarRelatorioEixo3Pdf(p: {
  empresa: string;
  levantamento: LevantamentoResumo;
  eixo3: NonNullable<DadosRelatorioFinal["eixo3"]>;
  totalFatores: number;
}): Promise<Buffer> {
  return renderToBuffer(
    <DocumentoAvulso
      titulo={`Eixo 03 — ${p.levantamento.nome}`}
      empresa={p.empresa}
      filhos={<Eixo3 levantamento={p.levantamento} eixo3={p.eixo3} totalFatores={p.totalFatores} />}
    />,
  );
}
