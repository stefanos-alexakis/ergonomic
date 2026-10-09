"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";

export type EstadoPesos = { erro?: string; sucesso?: boolean } | undefined;

/**
 * Cada input do form chega como `peso_<perguntaId>` — sem lista fixa de
 * IDs esperados no server, porque o form já sabe quais existem (vieram
 * do banco na renderização). Lê tudo que casa com o prefixo.
 *
 * Pesos são globais (valem para o Score Base de todas as empresas), então
 * só o admin da plataforma pode alterá-los. A checagem precisa estar AQUI,
 * não só no middleware: uma Server Action é chamada pelo header
 * `Next-Action` contra qualquer rota, inclusive as públicas — e os IDs das
 * perguntas aparecem no HTML da jornada do colaborador.
 */
function lerPesos(formData: FormData): { id: string; peso: number }[] | { erro: string } {
  const atualizacoes: { id: string; peso: number }[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("peso_")) continue;
    const peso = Number.parseFloat(String(valor).replace(",", "."));
    if (!Number.isFinite(peso) || peso <= 0) {
      return { erro: "Todos os pesos precisam ser números maiores que zero." };
    }
    atualizacoes.push({ id: chave.slice("peso_".length), peso });
  }
  if (atualizacoes.length === 0) return { erro: "Nenhuma pergunta encontrada no formulário." };
  return atualizacoes;
}

export async function atualizarPesosAction(_estadoAnterior: EstadoPesos, formData: FormData): Promise<EstadoPesos> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return { erro: "Sem permissão." };

  const atualizacoes = lerPesos(formData);
  if ("erro" in atualizacoes) return atualizacoes;

  // Só perguntas do questionário ativo: versões anteriores mantêm os pesos
  // com que suas pesquisas foram calculadas (a tela promete isso). Um ID de
  // outra versão afeta 0 linhas e cancela a transação inteira.
  const doQuestionarioAtivo = { fatorRisco: { dimensao: { bloco: { questionario: { ativo: true } } } } };
  try {
    await db.$transaction(async (tx) => {
      for (const a of atualizacoes) {
        // "Vai para o PGR": caixa marcada chega como `pgr_<id>`; desmarcada
        // não chega (por isso cada pergunta do formulário é gravada).
        const r = await tx.pergunta.updateMany({
          where: { id: a.id, ...doQuestionarioAtivo },
          data: { peso: a.peso, vaiParaPgr: formData.has(`pgr_${a.id}`) },
        });
        if (r.count !== 1) throw new Error("PERGUNTA_FORA_DO_QUESTIONARIO_ATIVO");
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PERGUNTA_FORA_DO_QUESTIONARIO_ATIVO") {
      return { erro: "Uma ou mais perguntas não pertencem ao questionário em uso. Recarregue a página." };
    }
    throw err;
  }

  // O React 19 recoloca os campos no valor padrão depois do envio: sem
  // recarregar os dados, a caixa do PGR "voltaria" ao estado antigo na tela.
  revalidatePath("/admin/perguntas");
  return { sucesso: true };
}

/**
 * Pesos das questões do Eixo 2 — mesmas regras do Eixo 1: só admin da
 * plataforma, só o catálogo do questionário ativo (avaliações antigas
 * mantêm os pesos com que foram calculadas).
 */
export async function atualizarPesosEixo2Action(_estadoAnterior: EstadoPesos, formData: FormData): Promise<EstadoPesos> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return { erro: "Sem permissão." };

  const atualizacoes = lerPesos(formData);
  if ("erro" in atualizacoes) return atualizacoes;

  const doCatalogoAtivo = {
    perguntaEixo1: { fatorRisco: { dimensao: { bloco: { questionario: { ativo: true } } } } },
  };
  try {
    await db.$transaction(async (tx) => {
      for (const a of atualizacoes) {
        const r = await tx.questaoEixo2.updateMany({ where: { id: a.id, ...doCatalogoAtivo }, data: { peso: a.peso } });
        if (r.count !== 1) throw new Error("QUESTAO_FORA_DO_CATALOGO_ATIVO");
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "QUESTAO_FORA_DO_CATALOGO_ATIVO") {
      return { erro: "Uma ou mais perguntas não pertencem ao questionário em uso. Recarregue a página." };
    }
    throw err;
  }
  return { sucesso: true };
}
