"use client";

import { useActionState, useMemo, useState } from "react";
import { excluirEmpresaAction } from "./actions";
import { Fieldset, Card } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type ResumoExclusao = {
  pesquisas: number;
  respostas: number;
  avaliacoesEixo2: number;
  levantamentosEixo3: number;
  acoesPlano: number;
  gestores: number;
};

/**
 * Exclusão definitiva da empresa. Duas travas contra engano: só aparece
 * com a empresa inativa, e o botão só libera digitando o nome exato.
 */
export function ExcluirEmpresaForm({
  workspaceId,
  nome,
  ativa,
  resumo,
}: {
  workspaceId: string;
  nome: string;
  ativa: boolean;
  resumo: ResumoExclusao;
}) {
  const acao = useMemo(() => excluirEmpresaAction.bind(null, workspaceId), [workspaceId]);
  const [estado, formAction, pendente] = useActionState(acao, undefined);
  const [digitado, setDigitado] = useState("");
  const confere = digitado.trim() === nome.trim();

  return (
    <Card className="border-red-200">
      <Fieldset legend="Excluir empresa">
        {ativa ? (
          <p className="text-sm text-zinc-600">
            Para excluir, primeiro desmarque <strong>Empresa ativa</strong> acima e salve. A exclusão só fica
            disponível para empresas inativas.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <div className="text-sm text-zinc-700">
              <p>
                Apaga <strong>definitivamente</strong> a empresa e tudo o que pertence a ela. Não há como desfazer.
              </p>
              <ul className="mt-2 list-disc pl-5 text-zinc-600">
                <li>{resumo.pesquisas} pesquisa(s), com {resumo.respostas} resposta(s) do Eixo 1</li>
                <li>{resumo.avaliacoesEixo2} avaliação(ões) do Eixo 2</li>
                <li>{resumo.levantamentosEixo3} levantamento(s) do Eixo 3</li>
                <li>{resumo.acoesPlano} ação(ões) do plano de ação</li>
                <li>setores, departamentos, logotipo e {resumo.gestores} usuário(s) gestor(es) desta empresa</li>
              </ul>
            </div>
            <Field label={`Digite "${nome}" para confirmar`} htmlFor="confirmacao">
              <Input
                id="confirmacao"
                name="confirmacao"
                autoComplete="off"
                value={digitado}
                onChange={(e) => setDigitado(e.target.value)}
              />
            </Field>
            {estado?.erro && <FieldError>{estado.erro}</FieldError>}
            <Button
              type="submit"
              variant="danger"
              disabled={!confere || pendente}
              className="self-start"
              onClick={(e) => {
                if (!window.confirm(`Excluir "${nome}" e todos os dados? Esta ação não pode ser desfeita.`)) e.preventDefault();
              }}
            >
              {pendente ? "Excluindo..." : "Excluir empresa e todos os dados"}
            </Button>
          </form>
        )}
      </Fieldset>
    </Card>
  );
}
