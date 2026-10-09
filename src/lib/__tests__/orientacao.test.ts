import { describe, expect, it } from "vitest";
import { extrairIdYoutube, lerOrientacao, urlEmbedYoutube, LIMITE_TEXTO_ORIENTACAO } from "@/lib/orientacao";

const ID = "dQw4w9WgXcQ";

describe("extrairIdYoutube", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `youtu.be/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    ` ${ID} `,
  ])("aceita %s", (link) => {
    expect(extrairIdYoutube(link)).toBe(ID);
  });

  it.each([
    "https://vimeo.com/123456",
    `https://evil.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `javascript:alert(1)//youtu.be/${ID}`,
    "https://www.youtube.com/watch?v=curto",
    `https://www.youtube.com/watch?v=${ID}"><script>`,
    "https://www.youtube.com/",
    "",
    "texto qualquer",
  ])("recusa %s", (link) => {
    expect(extrairIdYoutube(link)).toBeNull();
  });

  it("embed usa o modo de privacidade (sem cookies)", () => {
    expect(urlEmbedYoutube(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}?rel=0`);
  });
});

describe("lerOrientacao", () => {
  const form = (campos: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(campos)) f.set(k, v);
    return f;
  };

  it("tudo vazio → sem vídeo, sem texto, sem pré-pesquisa", () => {
    expect(lerOrientacao(form({}))).toEqual({
      ok: true,
      dados: { videoYoutubeId: null, textoOrientacao: null, exibirPrePesquisa: false },
    });
  });

  it("normaliza CRLF do texto e lê a caixa da pré-pesquisa", () => {
    const r = lerOrientacao(form({ videoYoutube: `https://youtu.be/${ID}`, textoOrientacao: " linha 1\r\nlinha 2 ", exibirPrePesquisa: "on" }));
    expect(r).toEqual({ ok: true, dados: { videoYoutubeId: ID, textoOrientacao: "linha 1\nlinha 2", exibirPrePesquisa: true } });
  });

  it("recusa link que não é do YouTube e texto longo demais", () => {
    expect(lerOrientacao(form({ videoYoutube: "https://vimeo.com/1" })).ok).toBe(false);
    expect(lerOrientacao(form({ textoOrientacao: "x".repeat(LIMITE_TEXTO_ORIENTACAO + 1) })).ok).toBe(false);
  });
});
