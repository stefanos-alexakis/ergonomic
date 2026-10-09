/**
 * Orientação ao colaborador (vídeo do YouTube + texto) cadastrada na
 * pesquisa. Funções puras — testáveis sem banco.
 */

const ID_VIDEO = /^[A-Za-z0-9_-]{11}$/;
const HOSTS_YOUTUBE = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

export const LIMITE_TEXTO_ORIENTACAO = 3000;

/**
 * Extrai o código do vídeo de qualquer formato de link do YouTube
 * (watch?v=, youtu.be/, shorts/, embed/, live/) ou do próprio código.
 * Qualquer outro site → null. Só o código é gravado: a página monta a
 * URL do embed sozinha, nunca com texto vindo do formulário.
 */
export function extrairIdYoutube(entrada: string): string | null {
  const t = entrada.trim();
  if (ID_VIDEO.test(t)) return t;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (HOSTS_YOUTUBE.has(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const [, tipo, codigo] = url.pathname.split("/");
      if (tipo === "shorts" || tipo === "embed" || tipo === "live" || tipo === "v") id = codigo ?? null;
    }
  }
  return id && ID_VIDEO.test(id) ? id : null;
}

/** Embed sem cookies de rastreamento (modo de privacidade do YouTube). */
export function urlEmbedYoutube(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export type DadosOrientacao = {
  videoYoutubeId: string | null;
  textoOrientacao: string | null;
  exibirPrePesquisa: boolean;
};

/** Lê os campos de orientação do formulário de criar/editar pesquisa. */
export function lerOrientacao(formData: FormData): { ok: true; dados: DadosOrientacao } | { ok: false; erro: string } {
  const link = String(formData.get("videoYoutube") ?? "").trim();
  const texto = String(formData.get("textoOrientacao") ?? "")
    .replace(/\r\n?/g, "\n")
    .trim();
  let videoYoutubeId: string | null = null;
  if (link) {
    videoYoutubeId = extrairIdYoutube(link);
    if (!videoYoutubeId) return { ok: false, erro: "Link do vídeo inválido: use um link do YouTube (youtube.com ou youtu.be)." };
  }
  if (texto.length > LIMITE_TEXTO_ORIENTACAO) {
    return { ok: false, erro: `Texto de orientação muito longo (máximo ${LIMITE_TEXTO_ORIENTACAO} caracteres).` };
  }
  return {
    ok: true,
    dados: { videoYoutubeId, textoOrientacao: texto || null, exibirPrePesquisa: formData.get("exibirPrePesquisa") === "on" },
  };
}

/**
 * O que foi digitado, para devolver junto com um erro: o React 19 limpa o
 * formulário depois de cada envio por action, e sem isso a pessoa perdia
 * tudo o que tinha preenchido por causa de um campo só.
 */
export function valoresDigitados(formData: FormData, campos: string[]): Record<string, string> {
  return Object.fromEntries(campos.map((c) => [c, String(formData.get(c) ?? "")]));
}
