import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As actions do Eixo 2 nunca podem confiar em empresa vinda do cliente:
 * sem sessão, recusam sem tocar em nada; com sessão, a empresa passada
 * adiante é sempre a resolvida pela sessão (getWorkspaceDoGestor).
 */

const m = vi.hoisted(() => ({
  getActor: vi.fn(),
  getWorkspaceDoGestor: vi.fn(),
  salvarResposta: vi.fn(),
  criarAvaliacao: vi.fn(),
  definirSetores: vi.fn(),
  adicionarItemCatalogo: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getActor: m.getActor }));
vi.mock("@/lib/pesquisa", () => ({ getWorkspaceDoGestor: m.getWorkspaceDoGestor }));
vi.mock("@/lib/estrutura", () => ({ adicionarItemCatalogo: m.adicionarItemCatalogo }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/avaliacao-eixo2", () => ({
  salvarResposta: m.salvarResposta,
  criarAvaliacao: m.criarAvaliacao,
  definirSetores: m.definirSetores,
  concluirAvaliacao: vi.fn(),
  excluirAvaliacao: vi.fn(),
  reabrirAvaliacao: vi.fn(),
  salvarFechamento: vi.fn(),
}));

import {
  criarAvaliacaoAction,
  criarSetorRapidoAction,
  salvarRespostaEixo2Action,
} from "@/app/gestor/eixo2/actions";

const payload = { questaoId: "q1", setorIds: ["s1"], condicao: "EFICAZ" };

describe("actions do Eixo 2", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sem sessão: recusa salvar resposta e não chama a camada de dados", async () => {
    m.getActor.mockResolvedValue(null);
    expect(await salvarRespostaEixo2Action("a1", payload)).toEqual({ ok: false, erro: "Sem permissão." });
    expect(m.salvarResposta).not.toHaveBeenCalled();
  });

  it("usuário sem empresa vinculada: recusa", async () => {
    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    m.getWorkspaceDoGestor.mockResolvedValue(null);
    expect(await salvarRespostaEixo2Action("a1", payload)).toEqual({ ok: false, erro: "Sem permissão." });
    expect(m.salvarResposta).not.toHaveBeenCalled();
  });

  it("com sessão: a empresa usada é a da sessão, nunca uma vinda do cliente", async () => {
    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    m.getWorkspaceDoGestor.mockResolvedValue({ id: "ws-da-sessao" });
    m.salvarResposta.mockResolvedValue({ ok: true });
    await salvarRespostaEixo2Action("a1", payload);
    expect(m.salvarResposta).toHaveBeenCalledWith("a1", "ws-da-sessao", payload);
  });

  it("criar avaliação sem sessão é recusado", async () => {
    m.getActor.mockResolvedValue(null);
    const fd = new FormData();
    fd.set("nome", "Avaliação");
    fd.append("setorId", "s1");
    expect(await criarAvaliacaoAction(undefined, fd)).toEqual({ erro: "Sem permissão." });
    expect(m.criarAvaliacao).not.toHaveBeenCalled();
  });

  it("criar setor rápido sem sessão é recusado; com sessão cadastra na empresa da sessão", async () => {
    m.getActor.mockResolvedValue(null);
    expect(await criarSetorRapidoAction("Produção")).toEqual({ ok: false, erro: "Sem permissão." });

    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    m.getWorkspaceDoGestor.mockResolvedValue({ id: "ws-da-sessao" });
    m.adicionarItemCatalogo.mockResolvedValue({ id: "s9", nome: "Produção" });
    expect(await criarSetorRapidoAction("  Produção ")).toEqual({ ok: true, setor: { id: "s9", nome: "Produção" } });
    expect(m.adicionarItemCatalogo).toHaveBeenCalledWith("ws-da-sessao", "setor", "Produção");
  });
});
