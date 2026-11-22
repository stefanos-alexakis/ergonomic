"use client";

import { useActionState, useState, useTransition } from "react";
import type { EstadoGerenciar } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldSuccess } from "@/components/ui/field";

type AcaoForm = (estado: EstadoGerenciar, formData: FormData) => Promise<EstadoGerenciar>;
type AcaoSimples = () => Promise<EstadoGerenciar>;

function Retorno({ estado }: { estado: EstadoGerenciar }) {
  if (estado?.erro) return <FieldError>{estado.erro}</FieldError>;
  if (estado?.mensagem) return <FieldSuccess>{estado.mensagem}</FieldSuccess>;
  return null;
}

/** Nova data de encerramento (datetime-local, no mesmo padrão da criação). */
export function FormEncerramento({
  acao,
  valorInicial,
  desabilitado,
}: {
  acao: AcaoForm;
  valorInicial: string;
  desabilitado: boolean;
}) {
  const [estado, formAction, pendente] = useActionState(acao, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <Field label="Encerramento" htmlFor="dataFim">
        <Input id="dataFim" name="dataFim" type="datetime-local" defaultValue={valorInicial} required disabled={desabilitado} />
      </Field>
      <Button type="submit" disabled={pendente || desabilitado} className="self-start">
        {pendente ? "Salvando..." : "Salvar encerramento"}
      </Button>
      <Retorno estado={estado} />
    </form>
  );
}

/** Botão de uma ação simples (arquivar, desarquivar, cancelar pedido), com o retorno na tela. */
export function BotaoAcao({
  acao,
  rotulo,
  variante = "secondary",
}: {
  acao: AcaoSimples;
  rotulo: string;
  variante?: "primary" | "secondary" | "danger";
}) {
  const [pendente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoGerenciar>();
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={variante}
        disabled={pendente}
        className="self-start"
        onClick={() =>
          iniciar(async () => {
            setEstado(await acao());
          })
        }
      >
        {pendente ? "Aguarde..." : rotulo}
      </Button>
      <Retorno estado={estado} />
    </div>
  );
}

/** Exclusão direta (pesquisa que não foi iniciada): um segundo clique confirma. */
export function ExcluirDireto({ acao }: { acao: AcaoSimples }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoGerenciar>();
  return (
    <div className="flex flex-col gap-3">
      {!confirmando ? (
        <Button type="button" variant="danger" className="self-start" onClick={() => setConfirmando(true)}>
          Excluir pesquisa
        </Button>
      ) : (
        <div role="alertdialog" aria-label="Confirmar exclusão" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900 mb-3">
            Excluir esta pesquisa e os códigos gerados? <strong>Isto não pode ser desfeito.</strong>
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  setEstado(await acao());
                })
              }
            >
              {pendente ? "Excluindo..." : "Sim, excluir"}
            </Button>
            <Button type="button" variant="ghost" disabled={pendente} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      <Retorno estado={estado} />
    </div>
  );
}

/** Confirmação por escrito: só habilita o botão quando o nome da pesquisa foi digitado igual. */
export function ConfirmacaoPorNome({
  acao,
  nomePesquisa,
  rotulo,
}: {
  acao: AcaoForm;
  nomePesquisa: string;
  rotulo: string;
}) {
  const [estado, formAction, pendente] = useActionState(acao, undefined);
  // Campo controlado: o React 19 limpa o formulário depois de cada envio.
  const [digitado, setDigitado] = useState("");
  const confere = digitado.trim().toLocaleLowerCase("pt-BR") === nomePesquisa.trim().toLocaleLowerCase("pt-BR");
  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-md">
      <Field label={`Para confirmar, digite o nome da pesquisa: ${nomePesquisa}`} htmlFor="confirmacao">
        <Input
          id="confirmacao"
          name="confirmacao"
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          autoComplete="off"
        />
      </Field>
      <Button type="submit" variant="danger" disabled={pendente || !confere} className="self-start">
        {pendente ? "Aguarde..." : rotulo}
      </Button>
      <Retorno estado={estado} />
    </form>
  );
}
