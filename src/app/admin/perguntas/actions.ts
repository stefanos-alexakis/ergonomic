"use server";

import { db } from "@/lib/db";

export type EstadoPesos = { erro?: string; sucesso?: boolean } | undefined;

/**
 * Cada input do form chega como `peso_<perguntaId>` — sem lista fixa de
 * IDs esperados no server, porque o form já sabe quais existem (vieram
 * do banco na renderização). Lê tudo que casa com o prefixo.
 */
export async function atualizarPesosAction(_estadoAnterior: EstadoPesos, formData: FormData): Promise<EstadoPesos> {
  const atualizacoes: { id: string; peso: number }[] = [];

  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("peso_")) continue;
    const perguntaId = chave.slice("peso_".length);
    const peso = Number.parseFloat(String(valor).replace(",", "."));
    if (!Number.isFinite(peso) || peso <= 0) {
      return { erro: "Todos os pesos precisam ser números maiores que zero." };
    }
    atualizacoes.push({ id: perguntaId, peso });
  }

  if (atualizacoes.length === 0) {
    return { erro: "Nenhuma pergunta encontrada no formulário." };
  }

  await db.$transaction(atualizacoes.map((a) => db.pergunta.update({ where: { id: a.id }, data: { peso: a.peso } })));

  return { sucesso: true };
}
