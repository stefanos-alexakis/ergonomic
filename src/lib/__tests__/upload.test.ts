import { describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { validarImagem, salvarLogoWorkspace, lerUpload } from "@/lib/upload";

function arquivo(bytes: number[], nome: string, tipo: string): File {
  return new File([Uint8Array.from(bytes)], nome, { type: tipo });
}

describe("validarImagem — validação por conteúdo real, sem tocar em disco (review.md §4.2)", () => {
  it("recusa um SVG disfarçado de PNG pela extensão e pelo Content-Type", async () => {
    const svgMalicioso = Buffer.from("<svg onload='alert(1)'></svg>", "utf-8");
    const arq = arquivo(Array.from(svgMalicioso), "logo.png", "image/png");
    const r = await validarImagem(arq);
    expect(r.ok).toBe(false);
  });

  it("recusa arquivo vazio", async () => {
    const r = await validarImagem(arquivo([], "logo.png", "image/png"));
    expect(r.ok).toBe(false);
  });

  it("recusa arquivo maior que o limite", async () => {
    const grande = new Array(2 * 1024 * 1024 + 1).fill(0x89);
    const r = await validarImagem(arquivo(grande, "logo.png", "image/png"));
    expect(r.ok).toBe(false);
  });

  it("aceita um PNG real (assinatura correta)", async () => {
    // assinatura PNG: 89 50 4E 47 0D 0A 1A 0A + padding para não ser "vazio"
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
    const r = await validarImagem(arquivo(png, "logo.png", "image/png"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.extensao).toBe("png");
  });

  it("aceita um JPEG real (assinatura correta)", async () => {
    const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
    const r = await validarImagem(arquivo(jpeg, "logo.jpg", "image/jpeg"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.extensao).toBe("jpg");
  });
});

describe("salvarLogoWorkspace — grava em uploads/ (fora de public/) de verdade", () => {
  it("grava o arquivo e devolve um caminho público, sem sobrar nada depois do teste", async () => {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
    const r = await salvarLogoWorkspace(arquivo(png, "logo.png", "image/png"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.caminhoPublico).toMatch(/^\/uploads\/[\w-]+\.png$/);
    const lido = await lerUpload(r.caminhoPublico);
    expect(lido?.contentType).toBe("image/png");
    expect(lido?.buffer.length).toBe(png.length);

    // Limpeza cirúrgica: apaga só o arquivo que este teste criou, pelo
    // nome exato devolvido — nunca a pasta inteira (foi isso que apagou
    // um logo real numa sessão anterior, ver review.md §6.10).
    await rm(join(process.cwd(), r.caminhoPublico), { force: true });
  });
});

describe("lerUpload — só lê nomes no formato gerado (contra path traversal)", () => {
  it.each([
    "../.env",
    "/uploads/../../.env",
    "..%2F.env",
    "logo.png",
    "3c3a2fdf-44d1-40e0-bac3-9264735becca.svg",
    "3c3a2fdf-44d1-40e0-bac3-9264735becca.png/../x",
    "",
  ])("recusa %s", async (nome) => {
    expect(await lerUpload(nome)).toBeNull();
  });

  it("devolve null para um nome válido que não existe", async () => {
    expect(await lerUpload("/uploads/00000000-0000-0000-0000-000000000000.png")).toBeNull();
  });
});
