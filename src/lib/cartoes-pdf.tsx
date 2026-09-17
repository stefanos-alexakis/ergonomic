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
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1pt solid #C3CFCB",
  },
  logo: { width: 40, height: 40, objectFit: "contain" },
  cabecalhoInfo: { flexDirection: "column", gap: 2 },
  cabecalhoEmpresa: { fontSize: 13, fontWeight: 700 },
  cabecalhoPesquisa: { fontSize: 10, color: "#5F7378" },
  cabecalhoValidade: { fontSize: 9, color: "#5F7378" },
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

/**
 * Buffer da imagem vira data URL — mesma técnica já usada pro QR
 * (linha acima), simples e sem depender de servir o arquivo por HTTP.
 * `formato` é passado por quem chama (route.ts), que já valida contra
 * PNG/JPEG antes de ler o arquivo — @react-pdf/renderer não decodifica
 * WebP.
 */
function logoParaDataUrl(buffer: Buffer, formato: "png" | "jpeg"): string {
  return `data:image/${formato};base64,${buffer.toString("base64")}`;
}

export async function gerarCartoesPdf(params: {
  pesquisaNome: string;
  urlBase: string; // ex.: https://pesquisa.agtrade.com.br/p/<workspaceSlug>/<pesquisaSlug> — igual em todo cartão
  cartoes: CartaoInput[];
  workspaceNome?: string;
  dataFim?: Date;
  logo?: { buffer: Buffer; formato: "png" | "jpeg" };
}): Promise<Buffer> {
  const { pesquisaNome, urlBase, cartoes, workspaceNome, dataFim, logo } = params;

  // Um único QR para toda a pesquisa — nunca um por código, para o link
  // impresso ser idêntico em todos os cartões.
  const qr = await gerarQrDataUrl(urlBase);
  const urlExibicao = urlBase.replace(/^https?:\/\//, "");
  const logoDataUrl = logo ? logoParaDataUrl(logo.buffer, logo.formato) : null;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {(workspaceNome || dataFim) && (
          // fixed: repete em todas as páginas, não só na primeira — os
          // cartões quebram de página automaticamente quando passam de
          // uma grade (react-pdf cuida disso sozinho via flexWrap).
          <View style={styles.cabecalho} fixed>
            {logoDataUrl && <Image src={logoDataUrl} style={styles.logo} />}
            <View style={styles.cabecalhoInfo}>
              {workspaceNome && <Text style={styles.cabecalhoEmpresa}>{workspaceNome}</Text>}
              <Text style={styles.cabecalhoPesquisa}>{pesquisaNome}</Text>
              {dataFim && (
                <Text style={styles.cabecalhoValidade}>
                  Válido até {dataFim.toLocaleDateString("pt-BR")}
                </Text>
              )}
            </View>
          </View>
        )}
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
