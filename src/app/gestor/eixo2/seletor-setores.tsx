"use client";

import { useState, useTransition } from "react";
import { criarSetorRapidoAction } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

/**
 * Lista os setores cadastrados para o usuário confirmar quais respondem o
 * Eixo 2 (todos marcados por padrão) e permite cadastrar um setor novo sem
 * sair da tela. Os marcados vão no form como `setorId`.
 */
export function SeletorSetores({
  setores: setoresIniciais,
  selecionados,
}: {
  setores: { id: string; nome: string }[];
  selecionados?: string[];
}) {
  const [setores, setSetores] = useState(setoresIniciais);
  const [marcados, setMarcados] = useState<Set<string>>(
    new Set(selecionados ?? setoresIniciais.map((s) => s.id)),
  );
  const [novoNome, setNovoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function alternar(id: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    setErro(null);
    startTransition(async () => {
      const r = await criarSetorRapidoAction(nome);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setSetores((lista) =>
        lista.some((s) => s.id === r.setor.id)
          ? lista
          : [...lista, r.setor].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
      setMarcados((atual) => new Set(atual).add(r.setor.id));
      setNovoNome("");
    });
  }

  const todos = setores.length > 0 && marcados.size === setores.length;

  return (
    <div className="flex flex-col gap-3">
      {setores.length > 1 && (
        <button
          type="button"
          onClick={() => setMarcados(todos ? new Set() : new Set(setores.map((s) => s.id)))}
          className="self-start text-xs text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
        >
          {todos ? "Desmarcar todos" : "Marcar todos"}
        </button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {setores.map((s) => (
          <label
            key={s.id}
            className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-800 cursor-pointer hover:border-zinc-300"
          >
            <input
              type="checkbox"
              name="setorId"
              value={s.id}
              checked={marcados.has(s.id)}
              onChange={() => alternar(s.id)}
              className="h-4 w-4 rounded border-zinc-300 cursor-pointer"
            />
            {s.nome}
          </label>
        ))}
      </div>

      {setores.length === 0 && (
        <p className="text-sm text-amber-700">
          Nenhum setor cadastrado ainda. O Eixo 2 é respondido por setor — cadastre pelo menos um abaixo.
        </p>
      )}

      <div className="flex gap-2 max-w-sm">
        <Input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="Novo setor"
          aria-label="Nome do novo setor"
        />
        <Button type="button" variant="secondary" onClick={adicionar} disabled={pendente || !novoNome.trim()}>
          {pendente ? "..." : "+ Adicionar"}
        </Button>
      </div>
      {erro && <FieldError>{erro}</FieldError>}
      <p className="text-xs text-zinc-500">
        {marcados.size} de {setores.length} setor(es) selecionado(s).
      </p>
    </div>
  );
}
