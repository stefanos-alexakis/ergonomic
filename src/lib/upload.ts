import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
 * Pasta dos logotipos, FORA de `public/`: em produção o Next só serve os
 * arquivos que já estavam em `public/` quando o servidor subiu — logo
 * enviado depois disso dava 404 até o próximo deploy (achado em produção:
 * 10 de 13 logos quebrados). Quem serve agora é a rota
 * `src/app/uploads/[arquivo]/route.ts`, lendo daqui. Caminho sempre
 * estático (não depende de env nem de parâmetro) — de propósito, para o
 * Turbopack conseguir rastrear e não empacotar o projeto inteiro no
 * deploy (review.md §6.10).
 */
const PASTA_UPLOADS = join(process.cwd(), "uploads");

/** Só o formato que `salvarLogoWorkspace` gera: <uuid>.<png|jpg|webp>. */
const NOME_ARQUIVO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;

const TIPOS: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/**
 * Salva o arquivo em `uploads/` com um nome gerado (nunca o nome original
 * enviado) e retorna o caminho público (`/uploads/<id>.<ext>`) para gravar
 * em `Workspace.logoUrl`.
 */
export async function salvarLogoWorkspace(file: File): Promise<ResultadoUpload> {
  const validado = await validarImagem(file);
  if (!validado.ok) return validado;

  const nomeArquivo = `${randomUUID()}.${validado.extensao}`;
  await mkdir(PASTA_UPLOADS, { recursive: true });
  await writeFile(join(PASTA_UPLOADS, nomeArquivo), validado.buffer);

  return { ok: true, caminhoPublico: `/uploads/${nomeArquivo}` };
}

/**
 * Lê um upload pelo nome do arquivo ou pelo caminho público
 * ("/uploads/<id>.png"). Qualquer nome fora do padrão gerado é recusado
 * antes de tocar no disco — sem "..", barras ou extensões estranhas.
 */
export async function lerUpload(
  nomeOuCaminho: string | null | undefined,
): Promise<{ buffer: Buffer; extensao: "png" | "jpg" | "webp"; contentType: string } | null> {
  if (!nomeOuCaminho) return null;
  const nome = nomeOuCaminho.startsWith("/uploads/") ? nomeOuCaminho.slice("/uploads/".length) : nomeOuCaminho;
  const casou = NOME_ARQUIVO.exec(nome);
  if (!casou) return null;
  const extensao = casou[1] as "png" | "jpg" | "webp";
  try {
    const buffer = await readFile(join(PASTA_UPLOADS, nome));
    return { buffer, extensao, contentType: TIPOS[extensao]! };
  } catch {
    return null;
  }
}

/** Apaga um upload (ex.: logo de empresa excluída). Silencioso se não existir. */
export async function apagarUpload(caminhoPublico: string | null | undefined): Promise<void> {
  if (!caminhoPublico?.startsWith("/uploads/")) return;
  const nome = caminhoPublico.slice("/uploads/".length);
  if (!NOME_ARQUIVO.test(nome)) return;
  await rm(join(PASTA_UPLOADS, nome), { force: true });
}

// ── PDFs dos relatórios emitidos ──────────────────────────────────────
// Mesma pasta persistente dos logos (volume em produção), numa subpasta.
// NUNCA servidos direto: só pela rota de download, que confere a empresa.
const PASTA_RELATORIOS = join(process.cwd(), "uploads", "relatorios");
const NOME_RELATORIO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

/** Grava o PDF e devolve o nome gerado (uuid.pdf). */
export async function salvarRelatorioPdf(pdf: Buffer): Promise<string> {
  const nome = `${randomUUID()}.pdf`;
  await mkdir(PASTA_RELATORIOS, { recursive: true });
  await writeFile(join(PASTA_RELATORIOS, nome), pdf);
  return nome;
}

export async function lerRelatorioPdf(nome: string): Promise<Buffer | null> {
  if (!NOME_RELATORIO.test(nome)) return null;
  try {
    return await readFile(join(PASTA_RELATORIOS, nome));
  } catch {
    return null;
  }
}

export async function apagarRelatorioPdf(nome: string): Promise<void> {
  if (!NOME_RELATORIO.test(nome)) return;
  await rm(join(PASTA_RELATORIOS, nome), { force: true });
}

/** Logo da empresa no formato que o gerador de PDF lê (PNG/JPEG); WebP fica de fora. */
export async function logoParaPdf(logoUrl: string | null | undefined): Promise<{ buffer: Buffer; formato: "png" | "jpeg" } | null> {
  const u = await lerUpload(logoUrl);
  if (!u || u.extensao === "webp") return null;
  return { buffer: u.buffer, formato: u.extensao === "png" ? "png" : "jpeg" };
}
