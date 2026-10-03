"use client";

import { useActionState, useMemo, useState } from "react";
import { salvarFechamentoAction, type EstadoEixo2 } from "../../actions";
import { Card, Fieldset } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Pratica = { descricao: string; frequencia: string; evidencia: string };
type LinhaPratica = Pratica & { chave: number };

let proximaChave = 0;
const linha = (p: Pratica): LinhaPratica => ({ ...p, chave: proximaChave++ });
const VAZIA: Pratica = { descricao: "", frequencia: "", evidencia: "" };

export function FechamentoForm({
  avaliacaoId,
  podeConcluir,
  inicial,
}: {
  avaliacaoId: string;
  podeConcluir: boolean;
  inicial: { participantes: string; responsavel: string; observacaoFinal: string; praticas: Pratica[] };
}) {
  const acao = useMemo(() => salvarFechamentoAction.bind(null, avaliacaoId), [avaliacaoId]);
  const [estado, formAction, pendente] = useActionState<EstadoEixo2, FormData>(acao, undefined);
  // Chave estável por linha: os campos não são controlados (defaultValue),
  // então chave por índice desalinharia os valores ao remover uma do meio.
  const [praticas, setPraticas] = useState<LinhaPratica[]>(() =>
    (inicial.praticas.length > 0 ? inicial.praticas : [VAZIA]).map(linha),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <Fieldset legend="Práticas adicionais declaradas pela empresa">
          <p className="text-sm text-zinc-500 -mt-2">
            Programas ou práticas que não aparecem nas perguntas (opcional).
          </p>
          {praticas.map((p, i) => (
            <div key={p.chave} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
              <Input name="pratica_descricao" defaultValue={p.descricao} placeholder="Descrição da prática / programa" aria-label={`Prática ${i + 1}: descrição`} />
              <Input name="pratica_frequencia" defaultValue={p.frequencia} placeholder="Frequência" aria-label={`Prática ${i + 1}: frequência`} />
              <Input name="pratica_evidencia" defaultValue={p.evidencia} placeholder="Evidência / documento" aria-label={`Prática ${i + 1}: evidência`} />
              <Button
                type="button"
                variant="ghost"
                aria-label={`Remover prática ${i + 1}`}
                onClick={() => setPraticas((lista) => lista.filter((x) => x.chave !== p.chave))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setPraticas((lista) => [...lista, linha(VAZIA)])}
          >
            + Adicionar prática
          </Button>
        </Fieldset>
      </Card>

      <Card>
        <Fieldset legend="Fechamento">
          <Field label="Participantes" htmlFor="participantes">
            <Input id="participantes" name="participantes" defaultValue={inicial.participantes} />
          </Field>
          <Field label="Observação técnica final / pontos para validação com o Eixo 1" htmlFor="observacaoFinal">
            <Textarea id="observacaoFinal" name="observacaoFinal" rows={4} defaultValue={inicial.observacaoFinal} />
          </Field>
          <Field label="Responsável pela entrevista / avaliação" htmlFor="responsavel">
            <Input id="responsavel" name="responsavel" defaultValue={inicial.responsavel} />
          </Field>
        </Fieldset>
      </Card>

      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      {estado?.mensagem && <p className="text-sm text-emerald-700">{estado.mensagem}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="intencao" value="salvar" variant="secondary" disabled={pendente}>
          Salvar
        </Button>
        <Button
          type="submit"
          name="intencao"
          value="concluir"
          disabled={pendente || !podeConcluir}
          title={!podeConcluir ? "Responda todas as perguntas em todos os setores primeiro" : undefined}
        >
          {pendente ? "Salvando..." : "Concluir avaliação"}
        </Button>
      </div>
    </form>
  );
}
