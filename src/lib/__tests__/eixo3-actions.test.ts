import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ocorrências CID-F são dado de saúde: sem sessão, nenhuma action do Eixo 3
 * toca na camada de dados; com sessão, a empresa usada é sempre a da sessão.
 */

const m = vi.hoisted(() => ({
  getActor: vi.fn(),
  getWorkspaceDoGestor: vi.fn(),
  importarPlanilha: vi.fn(),
  resolverSetor: vi.fn(),
  publicarLevantamento: vi.fn(),
  criarLevantamento: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getActor: m.getActor }));
vi.mock("@/lib/pesquisa", () => ({ getWorkspaceDoGestor: m.getWorkspaceDoGestor }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/levantamento-eixo3", () => ({
  importarPlanilha: m.importarPlanilha,
  resolverSetor: m.resolverSetor,
  publicarLevantamento: m.publicarLevantamento,
  criarLevantamento: m.criarLevantamento,
  atualizarIdentificacao: vi.fn(),
  excluirLevantamento: vi.fn(),
  reabrirLevantamento: vi.fn(),
}));

import {
  criarLevantamentoAction,
  importarPlanilhaAction,
  publicarLevantamentoAction,
  resolverSetorAction,
} from "@/app/gestor/eixo3/actions";

function arquivo() {
  const fd = new FormData();
  fd.set("planilha", new File([new Uint8Array([80, 75, 3, 4])], "ocorrencias.xlsx"));
  return fd;
}

describe("actions do Eixo 3", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sem sessão: nada é importado, associado, publicado ou criado", async () => {
    m.getActor.mockResolvedValue(null);
    expect(await importarPlanilhaAction("l1", undefined, arquivo())).toEqual({ erro: "Sem permissão." });
    expect(await resolverSetorAction("l1", "Produção", { tipo: "ignorar" })).toEqual({ ok: false, erro: "Sem permissão." });
    expect(await publicarLevantamentoAction("l1", undefined, new FormData())).toEqual({ erro: "Sem permissão." });
    expect(await criarLevantamentoAction(undefined, new FormData())).toEqual({ erro: "Sem permissão." });
    for (const fn of [m.importarPlanilha, m.resolverSetor, m.publicarLevantamento, m.criarLevantamento]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("usuário sem empresa: recusa", async () => {
    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    m.getWorkspaceDoGestor.mockResolvedValue(null);
    expect(await importarPlanilhaAction("l1", undefined, arquivo())).toEqual({ erro: "Sem permissão." });
    expect(m.importarPlanilha).not.toHaveBeenCalled();
  });

  it("com sessão: importa e publica na empresa e com o usuário da sessão", async () => {
    m.getActor.mockResolvedValue({ userId: "u-sessao", isPlatformAdmin: false });
    m.getWorkspaceDoGestor.mockResolvedValue({ id: "ws-sessao" });
    m.importarPlanilha.mockResolvedValue({ ok: true, total: 3, avisos: [], setoresPendentes: 0 });
    await importarPlanilhaAction("l1", undefined, arquivo());
    expect(m.importarPlanilha).toHaveBeenCalledWith("l1", "ws-sessao", expect.objectContaining({ nome: "ocorrencias.xlsx" }));

    m.publicarLevantamento.mockResolvedValue({ ok: false, erro: "x" });
    const fd = new FormData();
    fd.set("declaracao", "on");
    fd.set("responsavel", "Ana RH");
    await publicarLevantamentoAction("l1", undefined, fd);
    expect(m.publicarLevantamento).toHaveBeenCalledWith("l1", "ws-sessao", "u-sessao", {
      declaracao: true,
      responsavel: "Ana RH",
      cargoResponsavel: "",
    });
  });

  it("publicar sem marcar a declaração repassa declaracao=false (a camada de dados recusa)", async () => {
    m.getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    m.getWorkspaceDoGestor.mockResolvedValue({ id: "ws" });
    m.publicarLevantamento.mockResolvedValue({ ok: false, erro: "É preciso aceitar a declaração de veracidade para publicar." });
    const r = await publicarLevantamentoAction("l1", undefined, new FormData());
    expect(m.publicarLevantamento.mock.calls[0]![3].declaracao).toBe(false);
    expect(r).toEqual({ erro: "É preciso aceitar a declaração de veracidade para publicar." });
  });
});
