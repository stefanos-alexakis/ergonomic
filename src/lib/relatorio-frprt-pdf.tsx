import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { PainelFrprt } from "@/lib/painel-frprt";
import { CONCLUSOES, formatarEfeito, formatarRisco, notaDoRisco, type Conclusao } from "@/lib/score-final";
import { ORIENTACOES_EIXO3 } from "@/lib/planilha-modelo-eixo3";

/**
 * Relatório consolidado FRPRT (Eixos 1 × 2 × 3) — mesmas seções do painel,
 * mais a identificação das fontes, a declaração de veracidade do Eixo 3 e a
 * nota metodológica com as orientações técnicas da matriz CID-F (é o que
 * protege técnica e juridicamente a leitura dos atestados).
 */

const COR: Record<Conclusao, string> = { SEM_RISCO: "#047857", CONTROLE: "#B45309", RISCO_EXISTENTE: "#B91C1C" };

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 8.5, color: "#18181b" },
  titulo: { fontSize: 16, fontWeight: 700 },
  sub: { fontSize: 9, color: "#52525b", marginBottom: 10 },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  caixa: { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 4, padding: 8, marginBottom: 6 },
  linha: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f4f4f5", paddingVertical: 3 },
  cab: { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 4, fontWeight: 700, color: "#52525b" },
  pequeno: { fontSize: 7.5, color: "#71717a" },
  aviso: { fontSize: 8, color: "#92400e", marginBottom: 2 },
});

function Celula({ w, children, alinhar = "left", cor }: { w: number; children: React.ReactNode; alinhar?: "left" | "right" | "center"; cor?: string }) {
  return <Text style={{ width: `${w}%`, paddingHorizontal: 3, textAlign: alinhar, color: cor }}>{children}</Text>;
}

const data = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

export async function gerarRelatorioFrprtPdf(params: { workspaceNome: string; painel: PainelFrprt }): Promise<Buffer> {
  const { workspaceNome, painel } = params;
  const { opcoes, fatores, linhas, principais, pgr, limite } = painel;
  const nomeFator = (id: string) => fatores.find((f) => f.id === id)?.nome ?? "";

  const doc = (
    <Document title={`Relatório FRPRT — ${workspaceNome}`}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.titulo}>Relatório FRPRT — Fatores de Risco Psicossociais Relacionados ao Trabalho</Text>
        <Text style={s.sub}>
          {workspaceNome} · emitido em {new Date().toLocaleDateString("pt-BR")}
        </Text>

        <Text style={s.h2}>Fontes da análise</Text>
        <View style={s.caixa}>
          <Text>
            Eixo 1 — Percepção dos colaboradores:{" "}
            {opcoes.pesquisa
              ? `${opcoes.pesquisa.nome} (${data(opcoes.pesquisa.dataInicio)} a ${data(opcoes.pesquisa.dataFim)})`
              : "não considerado"}
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

        <Text style={s.h2}>Metodologia</Text>
        <View style={s.caixa}>
          <Text>
            Risco final = Eixo 1 (média 1–5 por fator e setor) × Fator do Eixo 2 (0,80 eficaz/N.A. · 0,90 precisa
            melhorar · 1,00 inexistente) × Fator do Eixo 3 (×1,10 quando há CID-F relacionado ao trabalho e compatível
            com o fator pela matriz Fatores × CID F). Até 3,00: sem risco indicado · acima de 3,00 até 4,00: percepção
            de perigos com controle existente · acima de 4,00: risco existente (plano de ação + PGR). Nota equivalente
            = 100 + 175 × (5 − risco). Setores com menos de {limite} respostas no Eixo 1 não têm score calculado,
            para proteger o anonimato.
          </Text>
        </View>

        <Text style={s.h2}>1. Painel resumido por setor</Text>
        <View style={s.cab}>
          <Celula w={20}>Setor</Celula>
          <Celula w={9} alinhar="right">Colaboradores</Celula>
          <Celula w={9} alinhar="right">Participação</Celula>
          <Celula w={10} alinhar="right">Eixo 1</Celula>
          <Celula w={10} alinhar="right">Eixo 2 (pts)</Celula>
          <Celula w={10} alinhar="right">Eixo 3 (pts)</Celula>
          <Celula w={10} alinhar="right">Risco final</Celula>
          <Celula w={10} alinhar="right">Nota</Celula>
          <Celula w={12} alinhar="right">Fatores → PGR</Celula>
        </View>
        {linhas.map((l) => (
          <View key={l.setorId} style={s.linha} wrap={false}>
            <Celula w={20}>{l.nome}</Celula>
            <Celula w={9} alinhar="right">{l.colaboradores ?? "—"}</Celula>
            <Celula w={9} alinhar="right">
              {l.participacao !== null ? `${Math.round(l.participacao * 100)}%` : `${l.respondentes} resp.`}
            </Celula>
            {l.suprimido ? (
              <Celula w={62} alinhar="center">
                Amostra insuficiente no Eixo 1 (n={l.respondentes}, mín. {limite})
              </Celula>
            ) : (
              <>
                <Celula w={10} alinhar="right">{l.eixo1 !== null ? formatarRisco(l.eixo1) : "—"}</Celula>
                <Celula w={10} alinhar="right">{l.efeitoEixo2 !== null ? formatarEfeito(l.efeitoEixo2) : "—"}</Celula>
                <Celula w={10} alinhar="right">{l.efeitoEixo3 !== null ? formatarEfeito(l.efeitoEixo3) : "—"}</Celula>
                <Celula w={10} alinhar="right" cor={l.conclusao ? COR[l.conclusao] : undefined}>
                  {l.final !== null ? formatarRisco(l.final) : "—"}
                </Celula>
                <Celula w={10} alinhar="right">{l.nota ?? "—"}</Celula>
                <Celula w={12} alinhar="right">{l.fatoresEmRisco}</Celula>
              </>
            )}
          </View>
        ))}

        <Text style={s.h2}>2. Principais fatores apontados nos setores</Text>
        {principais.length === 0 ? (
          <Text>Nenhum fator acima de 3,00.</Text>
        ) : (
          principais.map((p) => (
            <View key={p.fator.id} style={{ marginBottom: 4 }} wrap={false}>
              <Text>
                {p.fator.nome} — {Math.round(p.percentual * 100)}% dos setores acima de 3,00
              </Text>
              {p.tratativas.length > 0 && <Text style={s.pequeno}>Tratativas: {p.tratativas.join("; ")}</Text>}
            </View>
          ))
        )}
      </Page>

      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.h2}>3. Matriz de decisão por setor e fator</Text>
        <View style={s.cab} fixed>
          <Celula w={14}>Setor</Celula>
          <Celula w={20}>Fator</Celula>
          <Celula w={7} alinhar="right">Eixo 1</Celula>
          <Celula w={7} alinhar="right">Eixo 2</Celula>
          <Celula w={8} alinhar="right">Ajustado</Celula>
          <Celula w={14}>Eixo 3</Celula>
          <Celula w={8} alinhar="right">Final</Celula>
          <Celula w={22}>Conclusão / encaminhamento</Celula>
        </View>
        {linhas
          .filter((l) => !l.suprimido)
          .flatMap((l) =>
            l.celulas
              .filter((c) => c.final !== null)
              .sort((a, b) => (b.final ?? 0) - (a.final ?? 0))
              .map((c) => (
                <View key={`${l.setorId}-${c.fatorId}`} style={s.linha} wrap={false}>
                  <Celula w={14}>{l.nome}</Celula>
                  <Celula w={20}>{nomeFator(c.fatorId)}</Celula>
                  <Celula w={7} alinhar="right">{formatarRisco(c.eixo1!)}</Celula>
                  <Celula w={7} alinhar="right">{c.fatorEixo2.toFixed(2).replace(".", ",")}</Celula>
                  <Celula w={8} alinhar="right">{formatarRisco(c.ajustado!)}</Celula>
                  <Celula w={14}>
                    {c.rotuloEixo3}
                    {c.cidsEixo3.length ? ` (${c.cidsEixo3.join(", ")})` : ""}
                  </Celula>
                  <Celula w={8} alinhar="right" cor={COR[c.conclusao!]}>{formatarRisco(c.final!)}</Celula>
                  <Celula w={22}>
                    {CONCLUSOES[c.conclusao!].rotulo} — {CONCLUSOES[c.conclusao!].encaminhamento}
                  </Celula>
                </View>
              )),
          )}
      </Page>

      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.h2}>4. Riscos existentes que vão para o PGR (resultado final acima de 4,00)</Text>
        {pgr.length === 0 ? (
          <Text>Nenhum fator acima de 4,00.</Text>
        ) : (
          pgr.map((r) => (
            <View key={`${r.setor}-${r.fator.id}`} style={s.caixa} wrap={false}>
              <Text style={{ fontWeight: 700, fontSize: 9.5 }}>
                {r.setor} · {r.fator.nome} — risco {formatarRisco(r.celula.final!)} (nota {notaDoRisco(r.celula.final!)})
              </Text>
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

        <Text style={s.h2}>Nota metodológica — Eixo 3 (orientações técnicas da matriz Fatores × CID F)</Text>
        <View style={s.caixa}>
          {ORIENTACOES_EIXO3.slice(4).map((o) => (
            <Text key={o} style={{ marginBottom: 2 }}>
              • {o}
            </Text>
          ))}
        </View>
        <Text style={s.pequeno}>
          A classificação FMEA dos riscos encaminhados ao PGR é etapa posterior de priorização e não substitui a
          identificação acima.
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
