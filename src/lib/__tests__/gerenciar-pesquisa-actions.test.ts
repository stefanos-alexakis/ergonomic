import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As actions de gestão da pesquisa nunca confiam na empresa vinda do cliente:
 * sem sessão recusam sem tocar em nada; com sessão, a empresa passada adiante
 * é sempre a resolvida pela sessão.
 */

const m = vi.hoisted(() => ({
  getActor: vi.fn(),
  getWorkspaceDoGestor: vi.fn(),
  arquivarPesquisa: vi.fn(),
  excluirPesquisaNaoIniciada: vi.fn(),
  solicitarExclusao: vi.fn(),
  excluirDefinitivamente: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getActor: m.getActor }));
vi.mock("@/lib/pesquisa", () => ({ getWorkspaceDoGestor: m.getWorkspaceDoGestor }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/gestao-pesquisas", () => ({
  alterarEncerramento: vi.fn(),
  arquivarPesquisa: m.arquivarPesquisa,
  cancelarExclusao: vi.fn(),
  desarquivarPesquisa: vi.fn(),
  excluirDefinitivamente: m.excluirDefinitivamente,
  excluirPesquisaNaoIniciada: m.excluirPesquisaNaoIniciada,
  solicitarExclusao: m.solicitarExclusao,
}));

import {
  arquivarAction,
  excluirDefinitivamenteAction,
  excluirDiretoAction,
  solicitarExclusaoAction,
} from "@/app/gestor/pesquisas/[id]/gerenciar/actions";

const form = (nome: string) => {
  const f = new FormData();
  f.set("confirmacao", nome);
  return f;
};

describe("actions de gestão da pesquisa", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sem sessão: recusa tudo e não chama a camada de dados", async () => {
    m.getActor.mockResolvedValue(null);
    expect(await arquivarAction("p1")).toEqual({ erro: "Sem permissão." });
    expect(await excluirDiretoAction("p1")).toEqual({ erro: "Sem permissão." });
    expect(await solicitarExclusaoAction("p1", undefined, form("x"))).toEqual({ erro: "Sem permissão." });
    expect(await excluirDefinitivamenteAction("p1", undefined, form("x"))).toEqual({ erro: "Sem permissão." });
    expect(m.arquivarPesquisa).not.toHaveBeenCalled();
    expect(m.excluirPesquisaNaoIniciada).not.toHaveBeenCalled();
    expect(m.solicitarExclusao).not.toHaveBeenCalled();
    expect(m.excluirDefinitivamente).not.toHaveBeenCalled();
  });

  it("usuário sem empresa: recusa", async () => {
    m.getActor.mockResolvedValue({ userId: "u1" });
    m.getWorkspaceDoGestor.mockResolvedValue(null);
    expect(await arquivarAction("p1")).toEqual({ erro: "Sem permissão." });
    expect(m.arquivarPesquisa).not.toHaveBeenCalled();
  });

  it("com sessão: passa a empresa da sessão e o nome digitado para a camada de dados", async () => {
    m.getActor.mockResolvedValue({ userId: "u1" });
    m.getWorkspaceDoGestor.mockResolvedValue({ id: "w-da-sessao" });
    m.solicitarExclusao.mockResolvedValue({ ok: false, erro: "Digite o nome." });
    expect(await solicitarExclusaoAction("p1", undefined, form("Minha pesquisa"))).toEqual({ erro: "Digite o nome." });
    expect(m.solicitarExclusao).toHaveBeenCalledWith("p1", "w-da-sessao", "Minha pesquisa");
  });

  it("exclusão direta bem-sucedida redireciona para a lista", async () => {
    m.getActor.mockResolvedValue({ userId: "u1" });
    m.getWorkspaceDoGestor.mockResolvedValue({ id: "w1" });
    m.excluirPesquisaNaoIniciada.mockResolvedValue({ ok: true });
    await expect(excluirDiretoAction("p1")).rejects.toThrow("REDIRECT:/gestor");
  });
});
