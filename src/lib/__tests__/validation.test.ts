import { describe, expect, it } from "vitest";
import {
  contrasteSuficiente,
  gerarSlug,
  workspaceInputSchema,
} from "@/lib/validation";

describe("workspaceInputSchema", () => {
  it("aceita cor hexadecimal válida", () => {
    const r = workspaceInputSchema.safeParse({ nome: "Empresa X", corPrimaria: "#0F6E6E" });
    expect(r.success).toBe(true);
  });

  it("rejeita cor que não é hexadecimal (review.md §4.3)", () => {
    const r = workspaceInputSchema.safeParse({
      nome: "Empresa X",
      corPrimaria: "javascript:alert(1)",
    });
    expect(r.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const r = workspaceInputSchema.safeParse({ nome: "" });
    expect(r.success).toBe(false);
  });
});

describe("gerarSlug", () => {
  it("remove acentos e espaços", () => {
    expect(gerarSlug("Ergonômica & Cia LTDA")).toBe("ergonomica-cia-ltda");
  });

  it("não deixa hífens nas pontas", () => {
    expect(gerarSlug("  -Teste-  ")).toBe("teste");
  });
});

describe("contrasteSuficiente", () => {
  it("aprova preto sobre branco", () => {
    expect(contrasteSuficiente("#000000", "#FFFFFF")).toBe(true);
  });

  it("reprova amarelo claro sobre branco (review.md §4.3)", () => {
    expect(contrasteSuficiente("#FFF9C4", "#FFFFFF")).toBe(false);
  });
});
