import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { calcularScoreBase, calcularNivelRisco, SCORE_BASE_MINIMO, type DashboardPesquisa } from "@/lib/dashboard";

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
}): Promise<Buffer> {
  const { pesquisaNome, workspaceNome, dashboard } = params;

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
              Score Base (Eixo 1): {dashboard.scoreBase} / {dashboard.scoreBaseMaximo} pontos —{" "}
              <Text style={{ color: COR_POR_TOM[calcularNivelRisco(dashboard.scoreBase!).tom], fontWeight: 700 }}>
                {calcularNivelRisco(dashboard.scoreBase!).rotulo}
              </Text>{" "}
              (quanto maior, melhor; piso de {SCORE_BASE_MINIMO} pontos, mesmo no cenário mais grave).
            </Text>
            <Text>Média geral de risco: {dashboard.mediaGeral?.toFixed(2)} (escala 1–5)</Text>

            <Text style={styles.h2}>Por dimensão</Text>
            {dashboard.porDimensao.map((d) => (
              <View key={d.nome} style={styles.linha}>
                <Text style={styles.colNome}>{d.nome}</Text>
                <Text style={styles.colValor}>{d.media.toFixed(2)}</Text>
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
                    const scoreGrupo = g.suprimido ? null : calcularScoreBase(g.mediaGeral);
                    return (
                      <View key={g.nome} style={styles.linha}>
                        <Text style={styles.colNome}>{g.nome}</Text>
                        <Text
                          style={
                            scoreGrupo !== null
                              ? { ...styles.colValor, color: COR_POR_TOM[calcularNivelRisco(scoreGrupo).tom] }
                              : styles.colValor
                          }
                        >
                          {g.suprimido
                            ? "dados insuficientes"
                            : `${g.total} · média ${g.mediaGeral.toFixed(2)} · score ${scoreGrupo}`}
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
    </Document>
  );

  return renderToBuffer(doc);
}
