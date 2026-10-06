import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A severidade-base é metodologia (vale para todas as empresas): só o admin
 * da plataforma altera, com nota 1–5 e justificativa, e só fatores do
 * questionário ativo. Banco e sessão simulados.
 */

const { getActor, findMany, upsert, transaction } = vi.hoisted(() => ({
  getActor: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn((args: unknown) => args),
  transaction: vi.fn(async (ops: unknown[]) => ops),
}));

vi.mock("@/lib/tenant", () => ({ getActor }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { dimensao: { findMany }, severidadeFator: { upsert }, $transaction: transaction },
}));

import { salvarSeveridadeAction } from "@/app/admin/severidade/actions";

const JUST = "Justificativa técnica suficiente";

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

describe("salvarSeveridadeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([{ id: "d1" }]);
  });

  it("recusa sem sessão e não toca no banco", async () => {
    getActor.mockResolvedValue(null);
    expect(await salvarSeveridadeAction(undefined, form({ sev_d1: "4", just_d1: JUST }))).toEqual({ erro: "Sem permissão." });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("recusa gestor de empresa", async () => {
    getActor.mockResolvedValue({ userId: "u1", isPlatformAdmin: false });
    expect(await salvarSeveridadeAction(undefined, form({ sev_d1: "4", just_d1: JUST }))).toEqual({ erro: "Sem permissão." });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("recusa severidade fora de 1–5 ou não inteira", async () => {
    getActor.mockResolvedValue({ userId: "adm", isPlatformAdmin: true });
    for (const v of ["0", "6", "2.5", "abc"]) {
      const r = await salvarSeveridadeAction(undefined, form({ sev_d1: v, just_d1: JUST }));
      expect(r?.erro).toMatch(/1 a 5/);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("exige justificativa", async () => {
    getActor.mockResolvedValue({ userId: "adm", isPlatformAdmin: true });
    const r = await salvarSeveridadeAction(undefined, form({ sev_d1: "4", just_d1: "curta" }));
    expect(r?.erro).toMatch(/justificativa/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("recusa fator que não é do questionário ativo", async () => {
    getActor.mockResolvedValue({ userId: "adm", isPlatformAdmin: true });
    findMany.mockResolvedValue([]);
    const r = await salvarSeveridadeAction(undefined, form({ sev_d1: "4", just_d1: JUST }));
    expect(r?.erro).toMatch(/questionário em uso/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("admin salva, registrando quem alterou", async () => {
    getActor.mockResolvedValue({ userId: "adm", isPlatformAdmin: true });
    const r = await salvarSeveridadeAction(undefined, form({ sev_d1: "5", just_d1: JUST }));
    expect(r).toEqual({ sucesso: true });
    expect(upsert).toHaveBeenCalledWith({
      where: { dimensaoId: "d1" },
      update: { severidade: 5, justificativa: JUST, atualizadoPorId: "adm" },
      create: { dimensaoId: "d1", severidade: 5, justificativa: JUST, atualizadoPorId: "adm" },
    });
  });
});
