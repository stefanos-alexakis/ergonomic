import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Upload de logotipo da empresa. Validação por assinatura binária real
 * do arquivo (magic bytes), não pela extensão nem pelo Content-Type que
 * o navegador mandou — os dois são fáceis de falsificar. SVG é sempre
 * recusado, mesmo que alguém troque a extensão para .png: um SVG pode
 * conter script, e esse script rodaria no navegador de todo colaborador
 * que abrisse a pesquisa daquela empresa (review.md §4.2).
 */

const TAMANHO_MAXIMO_BYTES = 2 * 1024 * 1024; // 2MB

type FormatoImagem = "png" | "jpeg" | "webp";

function detectarFormato(bytes: Uint8Array): FormatoImagem | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export type ResultadoValidacao =
  | { ok: true; buffer: Buffer; extensao: "png" | "jpg" | "webp" }
  | { ok: false; erro: string };

/**
 * Só a validação — nenhum acesso a disco. Separado de propósito: é o
 * que permite testar toda a lógica de segurança (SVG malicioso, tamanho,
 * assinatura) sem escrever nada em lugar nenhum, e sem confundir o
 * rastreador de arquivos do Turbopack na hora do build (ver review.md
 * §6.10 — uma tentativa anterior de tornar a pasta de destino dinâmica
 * quebrou justamente isso).
 */
export async function validarImagem(file: File): Promise<ResultadoValidacao> {
  if (file.size === 0) {
    return { ok: false, erro: "Arquivo vazio." };
  }
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    return { ok: false, erro: `Arquivo maior que ${TAMANHO_MAXIMO_BYTES / 1024 / 1024}MB.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const formato = detectarFormato(buffer);
  if (!formato) {
    return { ok: false, erro: "Formato não reconhecido. Envie PNG, JPG ou WebP." };
  }

  return { ok: true, buffer, extensao: formato === "jpeg" ? "jpg" : formato };
}

export type ResultadoUpload =
  | { ok: true; caminhoPublico: string }
  | { ok: false; erro: string };

/**
 * Salva o arquivo em `public/uploads/` com um nome gerado (nunca o nome
 * original enviado) e retorna o caminho público (`/uploads/<id>.<ext>`)
 * para gravar em `Workspace.logoUrl`. Caminho de destino sempre estático
 * (não depende de env nem de parâmetro) — de propósito, para o Turbopack
 * conseguir rastrear e não empacotar o projeto inteiro no deploy.
 */
export async function salvarLogoWorkspace(file: File): Promise<ResultadoUpload> {
  const validado = await validarImagem(file);
  if (!validado.ok) return validado;

  const nomeArquivo = `${randomUUID()}.${validado.extensao}`;
  const pastaUploads = join(process.cwd(), "public", "uploads");
  await mkdir(pastaUploads, { recursive: true });
  await writeFile(join(pastaUploads, nomeArquivo), validado.buffer);

  return { ok: true, caminhoPublico: `/uploads/${nomeArquivo}` };
}
