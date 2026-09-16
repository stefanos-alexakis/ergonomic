import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";

/**
 * Cartões de acesso em PDF — 4 por página, cada um com o código, o tipo
 * (participante/teste, para o gestor separar na hora de distribuir) e um
 * QR code. Todos os cartões da mesma pesquisa levam ao **mesmo** endereço
 * (o QR nunca carrega o código) — quem chegar lá digita o próprio código
 * na tela. Antes o QR embutia `?codigo=`, um link diferente por cartão;
 * mudou a pedido do usuário para que o link seja sempre o mesmo e o
 * código nunca apareça em lugar nenhum de uma URL (reforça, não
 * enfraquece, o anonimato — review.md §1.2).
 *
 * Gerado com @react-pdf/renderer (não Playwright/Chromium headless):
 * a imagem Docker desta app não tem navegador instalado — usar um
 * navegador invisível para isso quebraria em produção (review.md §6.4).
 */

const styles = StyleSheet.create({
  page: { padding: 24, flexDirection: "column" },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cartao: {
    width: "47%",
    border: "1pt solid #C3CFCB",
    borderRadius: 4,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  qr: { width: 70, height: 70 },
  info: { flexDirection: "column", gap: 4, flex: 1 },
  pesquisaNome: { fontSize: 9, color: "#5F7378" },
  url: { fontSize: 8, color: "#5F7378" },
  rotuloCodigo: { fontSize: 7, color: "#5F7378", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  codigo: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  tipo: { fontSize: 8, color: "#0F6E6E" },
  tipoTeste: { fontSize: 8, color: "#B04A24" },
});

export type CartaoInput = { codigo: string; tipo: "PARTICIPANTE" | "TESTE" };

async function gerarQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 200 });
}

export async function gerarCartoesPdf(params: {
  pesquisaNome: string;
  urlBase: string; // ex.: https://pesquisa.agtrade.com.br/p/<workspaceSlug>/<pesquisaSlug> — igual em todo cartão
  cartoes: CartaoInput[];
}): Promise<Buffer> {
  const { pesquisaNome, urlBase, cartoes } = params;

  // Um único QR para toda a pesquisa — nunca um por código, para o link
  // impresso ser idêntico em todos os cartões.
  const qr = await gerarQrDataUrl(urlBase);
  const urlExibicao = urlBase.replace(/^https?:\/\//, "");

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.grade}>
          {cartoes.map((c) => (
            <View key={c.codigo} style={styles.cartao}>
              <Image src={qr} style={styles.qr} />
              <View style={styles.info}>
                <Text style={styles.pesquisaNome}>{pesquisaNome}</Text>
                <Text style={styles.url}>{urlExibicao}</Text>
                <Text style={styles.rotuloCodigo}>Seu código de acesso</Text>
                <Text style={styles.codigo}>{c.codigo}</Text>
                <Text style={c.tipo === "TESTE" ? styles.tipoTeste : styles.tipo}>
                  {c.tipo === "TESTE" ? "CÓDIGO DE TESTE" : "PARTICIPANTE"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
