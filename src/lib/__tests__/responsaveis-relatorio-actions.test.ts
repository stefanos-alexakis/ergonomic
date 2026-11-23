import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getActor: vi.fn(),
  getEmpresaParaEditar: vi.fn(),
  salvarResponsaveis: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getActor: m.getActor }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
vi.mock("@/lib/workspace", () => ({
  atualizarEmpresa: vi.fn(),
  excluirEmpresa: vi.fn(),
  getEmpresaParaEditar: m.getEmpresaParaEditar,
  redefinirSenhaGestor: vi.fn(),
}));
vi.mock("@/lib/upload", () => ({ apagarRelatorioPdf: vi.fn(), apagarUpload: vi.fn(), salvarLogoWorkspace: vi.fn() }));
vi.mock("@/lib/responsaveis-relatorio", async () => ({
  ...(await vi.importActual<typeof import("@/lib/responsaveis-relatorio-util")>("@/lib/responsaveis-relatorio-util")),
  salvarResponsaveis: m.salvarResponsaveis,
}));

import { salvarResponsaveisAction } from "@/app/admin/empresas/[id]/editar/actions";

const form = (linhas: unknown) => {
  const f = new FormData();
  f.set("linhas", JSON.stringify(linhas));
  return f;
};
const valida = [{ areaFuncao: "SESMT", nome: "Ana Lima", incluirNoRelatorio: true, ordem: 1 }];

describe("salvarResponsaveisAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("só o admin da plataforma salva", async () => {
    m.getActor.mockResolvedValue(null);
    expect(await salvarResponsaveisAction("w1", undefined, form(valida))).toEqual({ erro: "Sem permissão." });
    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    expect(await salvarResponsaveisAction("w1", undefined, form(valida))).toEqual({ erro: "Sem permissão." });
    expect(m.salvarResponsaveis).not.toHaveBeenCalled();
  });

  it("empresa inexistente: recusa sem gravar", async () => {
    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: true });
    m.getEmpresaParaEditar.mockResolvedValue(null);
    expect(await salvarResponsaveisAction("w-x", undefined, form(valida))).toEqual({ erro: "Empresa não encontrada." });
    expect(m.salvarResponsaveis).not.toHaveBeenCalled();
  });

  it("dados inválidos não gravam; válidos gravam na empresa da rota", async () => {
    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: true });
    m.getEmpresaParaEditar.mockResolvedValue({ workspace: { id: "w1" } });
    expect((await salvarResponsaveisAction("w1", undefined, form([{ nome: "", areaFuncao: "RH" }])))?.erro).toMatch(/informe o nome/);
    expect(m.salvarResponsaveis).not.toHaveBeenCalled();
    expect(await salvarResponsaveisAction("w1", undefined, form(valida))).toEqual({ sucesso: "Responsáveis salvos (1)." });
    expect(m.salvarResponsaveis).toHaveBeenCalledWith("w1", [expect.objectContaining({ nome: "Ana Lima", ordem: 1 })]);
  });
});
