import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regressão da falha de segurança da revisão corporativa: a action de pesos
 * não checava quem estava logado, e os pesos são globais (Score Base de
 * todas as empresas). Banco e sessão são simulados — o que interessa aqui é
 * que nada chega ao banco sem um admin da plataforma.
 */

const { getActor, updateMany, transaction } = vi.hoisted(() => {
  const updateMany = vi.fn();
  return {
    getActor: vi.fn(),
    updateMany,
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({ pergunta: { updateMany } })),
  };
});

vi.mock("@/lib/tenant", () => ({ getActor }));
vi.mock("@/lib/db", () => ({ db: { $transaction: transaction } }));

import { atualizarPesosAction } from "@/app/admin/perguntas/actions";

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

describe("atualizarPesosAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("recusa chamada sem sessão e não toca no banco", async () => {
    getActor.mockResolvedValue(null);
    const r = await atualizarPesosAction(undefined, form({ peso_p1: "3" }));
    expect(r).toEqual({ erro: "Sem permissão." });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("recusa gestor de empresa (não é admin da plataforma)", async () => {
    getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    const r = await atualizarPesosAction(undefined, form({ peso_p1: "3" }));
    expect(r).toEqual({ erro: "Sem permissão." });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("admin da plataforma atualiza, restrito ao questionário ativo", async () => {
    getActor.mockResolvedValue({ userId: "admin", isPlatformAdmin: true });
    const r = await atualizarPesosAction(undefined, form({ peso_p1: "2,5" }));
    expect(r).toEqual({ sucesso: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "p1", fatorRisco: { dimensao: { bloco: { questionario: { ativo: true } } } } },
      data: { peso: 2.5 },
    });
  });

  it("pergunta de versão anterior (0 linhas afetadas) vira erro amigável, sem sucesso parcial", async () => {
    getActor.mockResolvedValue({ userId: "admin", isPlatformAdmin: true });
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const r = await atualizarPesosAction(undefined, form({ peso_p1: "2", peso_v1antiga: "4" }));
    expect(r?.erro).toMatch(/não pertencem ao questionário em uso/);
  });
});
