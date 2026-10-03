import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Integridade do catálogo do Eixo 2 extraído do documento da cliente. */

type ItemEixo2 = { ordem: number; perguntaColaborador: string; texto: string; planoSugerido: string | null };
type PerguntaV2 = { ordemGlobal: number; texto: string };

const ler = <T,>(arquivo: string) =>
  JSON.parse(readFileSync(join(process.cwd(), "prisma", "seed-data", arquivo), "utf-8")) as T;

const itens = ler<ItemEixo2[]>("eixo2-v2.json");
const perguntasV2 = ler<PerguntaV2[]>("perguntas-v2.json");

describe("eixo2-v2.json", () => {
  it("tem uma questão para cada uma das 35 perguntas do Eixo 1 v2, na mesma ordem", () => {
    expect(itens.map((i) => i.ordem)).toEqual(perguntasV2.map((p) => p.ordemGlobal));
  });

  it("a pergunta ao colaborador citada no Eixo 2 é a mesma do Eixo 1 v2 (ligação 1:1 confere)", () => {
    const normalizar = (s: string) => s.replace(/\s+/g, " ").replace(/Exemplo:.*$/, "").trim().slice(0, 40);
    for (const item of itens) {
      const pergunta = perguntasV2.find((p) => p.ordemGlobal === item.ordem)!;
      expect(normalizar(item.perguntaColaborador)).toBe(normalizar(pergunta.texto));
    }
  });

  it("toda questão tem texto; só a 30 (assédio) está sem plano sugerido no documento", () => {
    for (const item of itens) expect(item.texto.trim()).not.toBe("");
    expect(itens.filter((i) => !i.planoSugerido).map((i) => i.ordem)).toEqual([30]);
  });

  it("plano sugerido vem em itens separados por linha, não grudados", () => {
    const plano = itens.find((i) => i.ordem === 3)!.planoSugerido!;
    expect(plano.split("\n")).toEqual([
      "- Treinamentos com registros",
      "- Integração",
      "- Manuais e/ou informativos",
      "- Reciclagens/atualização",
    ]);
  });
});
