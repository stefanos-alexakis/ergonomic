# Plataforma de Pesquisa de Riscos Psicossociais — Documentação

Plataforma web multiempresa para identificar, medir e encaminhar os **Fatores de Risco Psicossociais
Relacionados ao Trabalho (FRPRT)** exigidos pela NR-1 (gerenciamento de riscos ocupacionais e PGR).

Em produção: **https://pesquisa.agtrade.com.br**

## Documentos

| Documento | Para quem | Conteúdo |
|---|---|---|
| [Guia rápido do Score](score-frprt.html) | Todos | Uma página, com régua e exemplos. Abra no navegador. |
| [Manual de uso](manual-de-uso.md) | Admin e gestores | Passo a passo de cada tela. |
| [Metodologia e cálculos](metodologia.md) | Técnico SST, consultoria | Fórmulas, cortes, FMEA, regras de anonimato e da matriz CID. |
| [Proposta da Matriz FMEA](proposta-fmea.html) | Consultoria | Severidade por fator com evidências, agravantes, matriz e prazos. |
| [Arquitetura](arquitetura.md) | Desenvolvimento | Stack, pastas, modelo de dados, segurança e LGPD. |
| [Operação](operacao.md) | Desenvolvimento / TI | Ambiente local, testes, publicação, backup. |

Documentos de origem do projeto (não repetidos aqui):
- `specs/001-pesquisa-riscos-psicossociais/` — especificação, plano, modelo de dados e revisões.
- `.specify/memory/constitution.md` — princípios inegociáveis (anonimato, isolamento entre empresas).

## Visão geral

A avaliação de cada empresa combina **três eixos**, sempre por **setor** e por **fator de risco**
(13 fatores do questionário):

| Eixo | Quem informa | O que mede | Efeito no score |
|---|---|---|---|
| 1 · Percepção | Colaboradores (anônimo) | Como o trabalho é percebido | Base de 1 a 5 |
| 2 · Medidas de controle | Gestor da empresa | O que a empresa já faz | Reduz até 20% (×0,80 a ×1,00) |
| 3 · Atestados CID-F | RH/DP da empresa | O que já aconteceu | Agrava 10% (×1,10) quando há caso ligado ao trabalho |

```
Risco final (1–5) = Eixo 1 × Fator Eixo 2 × Fator Eixo 3
  até 3,00  → sem risco
  3,01–4,00 → atenção (perigo com controle existente)
  acima 4,00 → risco existente → plano de ação
  PGR: só as situações inerentes à função (8, marcadas pelo admin) com índice próprio acima de 3,00
```

O resultado aparece no **Painel FRPRT** e no **relatório PDF**, prontos para alimentar o PGR.

## Perfis de acesso

- **Administrador da plataforma** — cadastra empresas (logo, cores, gestor), ajusta pesos das
  perguntas, redefine senhas e pode entrar na visão de qualquer gestor.
- **Gestor da empresa** — cria pesquisas e licenças, cadastra setores, responde o Eixo 2, publica o
  Eixo 3 e acompanha painéis. Só enxerga a própria empresa.
- **Colaborador** — não tem cadastro. Entra pelo link da pesquisa com um código anônimo de uso
  único (cartão impresso com QR Code).

## Módulos

1. **Empresas e identidade visual** — logo e cores aplicadas no menu, botões, jornada do
   colaborador e PDFs.
2. **Estrutura organizacional** — setores e departamentos (manual ou por planilha) e número de
   colaboradores por setor.
3. **Pesquisas e licenças (Eixo 1)** — questionário v2 com 35 perguntas em 13 fatores, códigos
   anônimos (+5% de códigos de teste), cartões em PDF, painel da pesquisa com índice e faixas de cor, e relatório.
4. **Eixo 2 · Medidas de controle** — avaliação por setor, com exceções e plano de ação.
5. **Eixo 3 · Atestados CID-F** — publicação de planilha, mapeamento de setores, declaração de
   veracidade e painel de ocorrências.
6. **Painel FRPRT** — cruzamento dos três eixos, principais achados, **Matriz FMEA** (prioridade de
   ação e prazos), matriz de decisão, lista para o PGR e relatório PDF.
7. **Plano de ação** — ações 5W2H geradas do Eixo 2 ou criadas à mão, ciclo PDCA com verificação de
   eficácia antes × depois, ações corretivas, histórico e exportação em Excel e PDF.
