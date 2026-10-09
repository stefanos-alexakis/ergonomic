import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { calcularNivelRisco, type DashboardPesquisa } from "@/lib/dashboard";
import type { PerfilParticipantes } from "@/lib/perfil-participantes";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10 },
  titulo: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitulo: { fontSize: 10, color: "#5F7378", marginBottom: 16 },
  contadores: { flexDirection: "row", gap: 24, marginBottom: 16 },
  contadorNum: { fontSize: 18, fontWeight: 700 },
  contadorLabel: { fontSize: 9, color: "#5F7378" },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  linha: { flexDirection: "row", borderBottom: "1pt solid #DBE3E0", paddingVertical: 4 },
  colNome: { flex: 2 },
  colValor: { flex: 1, textAlign: "right" },
});

// Mesmas 3 faixas de src/components/ui/badge.tsx, em hex pro react-pdf (não
// lê classes Tailwind) — cores emparelhadas com o tom (perigo/atencao/sucesso).
const COR_POR_TOM: Record<ReturnType<typeof calcularNivelRisco>["tom"], string> = {
  perigo: "#B91C1C",
  atencao: "#B45309",
  sucesso: "#047857",
};

export async function gerarRelatorioPdf(params: {
  pesquisaNome: string;
  workspaceNome: string;
  dashboard: DashboardPesquisa;
  perfil?: PerfilParticipantes | null;
}): Promise<Buffer> {
  const { pesquisaNome, workspaceNome, dashboard, perfil } = params;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>{pesquisaNome}</Text>
        <Text style={styles.subtitulo}>{workspaceNome} — relatório de riscos psicossociais</Text>

        <View style={styles.contadores}>
          <View>
            <Text style={styles.contadorNum}>{dashboard.contadores.distribuidos}</Text>
            <Text style={styles.contadorLabel}>códigos distribuídos</Text>
          </View>
          <View>
            <Text style={styles.contadorNum}>{dashboard.contadores.iniciadas}</Text>
            <Text style={styles.contadorLabel}>iniciadas</Text>
          </View>
          <View>
            <Text style={styles.contadorNum}>{dashboard.contadores.concluidas}</Text>
            <Text style={styles.contadorLabel}>concluídas</Text>
          </View>
        </View>

        {!dashboard.suficiente ? (
          <Text>
            Ainda não há respostas concluídas suficientes para exibir indicadores com segurança
            (mínimo de {dashboard.limiteSupressaoGrupo} respostas).
          </Text>
        ) : (
          <>
            <Text>
              Índice geral do Eixo 1:{" "}
              <Text style={{ color: COR_POR_TOM[calcularNivelRisco(dashboard.mediaGeral!).tom], fontWeight: 700 }}>
                {dashboard.mediaGeral!.toFixed(2).replace(".", ",")} · {calcularNivelRisco(dashboard.mediaGeral!).rotulo}
              </Text>{" "}
              (escala 1–5, quanto maior, mais exposição). Mesma régua do Painel FRPRT: verde baixo risco (até 3,00) ·
              amarelo médio risco (3,01 a 4,00) · vermelho alto risco (acima de 4,00).
            </Text>

            <Text style={styles.h2}>Por dimensão</Text>
            {dashboard.porDimensao.map((d) => (
              <View key={d.nome} style={styles.linha}>
                <Text style={styles.colNome}>{d.nome}</Text>
                <Text style={{ ...styles.colValor, color: COR_POR_TOM[calcularNivelRisco(d.media).tom], fontWeight: 700 }}>
                  {d.media.toFixed(2).replace(".", ",")} · {calcularNivelRisco(d.media).rotulo}
                </Text>
              </View>
            ))}

            {(
              [
                ["Por setor", dashboard.porSetor],
                ["Por departamento", dashboard.porDepartamento],
              ] as const
            ).map(([titulo, grupos]) =>
              grupos.length === 0 ? null : (
                <View key={titulo}>
                  <Text style={styles.h2}>{titulo}</Text>
                  {grupos.map((g) => {
                    return (
                      <View key={g.nome} style={styles.linha}>
                        <Text style={styles.colNome}>{g.nome}</Text>
                        <Text
                          style={
                            !g.suprimido
                              ? { ...styles.colValor, color: COR_POR_TOM[calcularNivelRisco(g.mediaGeral).tom] }
                              : styles.colValor
                          }
                        >
                          {g.suprimido
                            ? "dados insuficientes"
                            : `${g.total} resp. · índice ${g.mediaGeral.toFixed(2).replace(".", ",")} · ${calcularNivelRisco(g.mediaGeral).rotulo}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ),
            )}
          </>
        )}
      </Page>

      {/* Pré-pesquisa: página própria, sempre separada do Eixo 1 (decisão do cliente). */}
      {perfil && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.titulo}>Perfil dos participantes (pré-pesquisa)</Text>
          <Text style={styles.subtitulo}>
            Totais da pesquisa inteira, sem ligação com as respostas do questionário. {perfil.responderam} de{" "}
            {perfil.concluidas} participante(s) responderam.
          </Text>
          {!perfil.suficiente ? (
            <Text>Menos de {perfil.limite} pré-pesquisas respondidas: perfil oculto para proteger o anonimato.</Text>
          ) : (
            perfil.distribuicao.map((d) => (
              <View key={d.pergunta.chave} wrap={false}>
                <Text style={styles.h2}>
                  {d.pergunta.rotuloCurto} ({d.respondentes} resposta(s){d.semResposta ? `, ${d.semResposta} em branco` : ""})
                </Text>
                {d.opcoes.map((o) => (
                  <View key={o.valor} style={styles.linha}>
                    <Text style={styles.colNome}>{o.rotulo}</Text>
                    <Text style={styles.colValor}>
                      {o.quantidade} · {Math.round(o.percentual * 100)}%
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </Page>
      )}
    </Document>
  );

  return renderToBuffer(doc);
}
