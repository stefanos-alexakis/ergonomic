import { describe, expect, it } from "vitest";
import { assinantesDe, lerResponsaveis, LIMITES_RESPONSAVEL, MAX_RESPONSAVEIS } from "@/lib/responsaveis-relatorio-util";

const linha = (extra: Record<string, unknown> = {}) => ({
  areaFuncao: "SESMT",
  nome: "Ana Lima",
  especialidade: "",
  descritivo: "",
  empresa: "Empresa X",
  email: "",
  celular: "",
  incluirNoRelatorio: true,
  ordem: null,
  ...extra,
});
const ler = (linhas: unknown[]) => lerResponsaveis(JSON.stringify(linhas));

describe("lerResponsaveis", () => {
  it("aceita só nome e área/função; campos vazios viram null", () => {
    const r = ler([linha()]);
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    expect(r.linhas[0]).toMatchObject({
      nome: "Ana Lima",
      areaFuncao: "SESMT",
      especialidade: null,
      descritivo: null,
      email: null,
      celular: null,
      ordem: 1,
    });
  });

  it("exige nome e área/função, informando a linha", () => {
    expect(ler([linha(), linha({ nome: " " })])).toEqual({ ok: false, erro: "Linha 2: informe o nome." });
    expect(ler([linha({ areaFuncao: "" })])).toEqual({ ok: false, erro: "Linha 1: informe a área / função." });
  });

  it("valida e-mail, tamanho e ordem", () => {
    expect(ler([linha({ email: "sem-arroba" })]).ok).toBe(false);
    expect(ler([linha({ celular: "9".repeat(LIMITES_RESPONSAVEL.celular + 1) })]).ok).toBe(false);
    expect(ler([linha({ ordem: 0 })]).ok).toBe(false);
    expect(ler([linha({ ordem: 1.5 })]).ok).toBe(false);
    expect(ler([linha({ ordem: 1000 })]).ok).toBe(false);
  });

  it("recusa lista grande demais e JSON inválido", () => {
    expect(ler(Array.from({ length: MAX_RESPONSAVEIS + 1 }, () => linha())).ok).toBe(false);
    expect(lerResponsaveis("{").ok).toBe(false);
    expect(lerResponsaveis('{"a":1}').ok).toBe(false);
  });

  it("ordena pelo número escolhido; sem número vai depois, na ordem da tela; renumera 1..n", () => {
    const r = ler([
      linha({ nome: "C sem número" }),
      linha({ nome: "Bia", ordem: 5 }),
      linha({ nome: "Ana", ordem: 2 }),
      linha({ nome: "D sem número" }),
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.linhas.map((l) => [l.nome, l.ordem])).toEqual([
      ["Ana", 1],
      ["Bia", 2],
      ["C sem número", 3],
      ["D sem número", 4],
    ]);
  });

  it("empate de número mantém a ordem da tela", () => {
    const r = ler([linha({ nome: "Primeiro", ordem: 1 }), linha({ nome: "Segundo", ordem: 1 })]);
    expect(r.ok && r.linhas.map((l) => l.nome)).toEqual(["Primeiro", "Segundo"]);
  });

  it("descritivo mantém quebras de linha; os demais campos ficam em uma linha", () => {
    const r = ler([linha({ descritivo: "Linha 1\r\nLinha 2", nome: "Ana\nLima" })]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.linhas[0]!.descritivo).toBe("Linha 1\nLinha 2");
    expect(r.linhas[0]!.nome).toBe("Ana Lima");
  });

  it("incluirNoRelatorio só vale com true de verdade", () => {
    const r = ler([linha({ incluirNoRelatorio: "true" }), linha({ incluirNoRelatorio: true })]);
    expect(r.ok && r.linhas.map((l) => l.incluirNoRelatorio)).toEqual([false, true]);
  });
});

describe("assinantesDe", () => {
  const base = { especialidade: null, descritivo: null, empresa: null, email: "a@x.com", celular: "11 99999-0000" };
  it("só os marcados, na ordem definida, com e-mail e celular", () => {
    const r = assinantesDe([
      { ...base, nome: "Terceiro", areaFuncao: "RH", incluirNoRelatorio: true, ordem: 3 },
      { ...base, nome: "Fora", areaFuncao: "TI", incluirNoRelatorio: false, ordem: 1 },
      { ...base, nome: "Primeiro", areaFuncao: "SESMT", incluirNoRelatorio: true, ordem: 2 },
    ]);
    expect(r.map((x) => x.nome)).toEqual(["Primeiro", "Terceiro"]);
    expect(r[0]).toEqual({ ...base, nome: "Primeiro", areaFuncao: "SESMT" });
  });
});
