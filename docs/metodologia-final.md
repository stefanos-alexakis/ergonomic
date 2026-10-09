<!-- Gerado por scripts/gerar-metodologia.ts — não edite à mão; edite src/lib/relatorio/metodologia.ts. -->

# Metodologia de pontuação — FRPRT

## Visão geral

A avaliação dos Fatores de Risco Psicossociais Relacionados ao Trabalho (FRPRT) cruza três fontes independentes de informação, por setor e por fator (13 fatores, 35 situações investigadas), atendendo ao gerenciamento de riscos ocupacionais da NR-1 e ao Programa de Gerenciamento de Riscos (PGR).

| Eixo | Quem informa | O que mede | Papel no índice |
|---|---|---|---|
| 1 · Percepção | Colaboradores, de forma anônima | Como o trabalho é percebido | Base de 1 a 5 |
| 2 · Medidas de controle | Empresa (gestor/consultoria) | O que a empresa já faz | Reduz até 20% (×0,80 a ×1,00) |
| 3 · Atestados CID-F | RH/DP da empresa | O que já aconteceu | Agrava 10% (×1,10) com caso ligado ao trabalho |

## Eixo 1 — Percepção dos colaboradores

Cada colaborador responde 35 perguntas na escala Nunca (1), Raramente (2), Às vezes (3), Frequentemente (4) e Sempre (5), pensando nos últimos 6 meses. Quanto maior o valor, maior a exposição. Cada pergunta tem um peso (padrão 1), ajustável pelo administrador da plataforma.

- Índice do fator no setor: média ponderada de todas as respostas dos colaboradores do setor às perguntas daquele fator.
- Respondente exposto: resposta (ou média individual no fator) igual ou maior que 4 — Frequentemente ou Sempre.
- Só entram respostas concluídas; códigos de teste nunca entram nos indicadores.

## Eixo 2 — Medidas de controle

Para cada situação investigada, a empresa informa, por setor, a condição da medida de controle. O fator do Eixo 2 é a média ponderada das condições das questões do fator (setor fora da avaliação entra como ×1,00).

| Condição | Fator |
|---|---|
| Existente e eficaz | ×0,80 |
| Existente, precisa melhorar | ×0,90 |
| Inexistente | ×1,00 |
| Não se aplica | ×0,80 |

## Eixo 3 — Atestados e afastamentos CID-F

O RH/DP publica as ocorrências CID-F do período, sem identificar o trabalhador, com a relação com o trabalho (Sim, Não ou Inconclusivo). Se houve no setor ao menos uma ocorrência com relação "Sim" e CID compatível com o fator (matriz Fatores × CID F), o fator recebe ×1,10; senão, ×1,00. A quantidade de ocorrências não gradua o agravamento.

- Subcódigos citados explicitamente na matriz (ex.: F43.1) só casam com os fatores que os citam; os demais casam pela categoria (F41.1 → F41).
- CID sem correspondência na matriz não agrava nenhum fator; ocorrência Inconclusiva não agrava, mas é sinalizada para investigação.
- O CID não comprova nexo causal isoladamente: o Eixo 3 é indicador agravante coletivo, não prova individual.

## Índice final e faixas

```
Índice final = Eixo 1 × Fator do Eixo 2 × Fator do Eixo 3   (escala 1 a 5; quanto maior, pior)
```

| Índice final | Faixa | Conclusão | Encaminhamento |
|---|---|---|---|
| até 3,00 | Índice baixo | Sem risco indicado | Sem inclusão automática |
| 3,01 a 4,00 | Índice médio | Percepção de perigos com controle existente | Acompanhar e manter controle |
| acima de 4,00 | Índice alto | Risco existente | Plano de ação |

- Comparação em centésimos: 3,00 calculado nunca passa para a faixa seguinte.
- Índice do setor = média dos fatores com dado; resultado geral da empresa = média dos setores com índice.
- Terminologia: antes da matriz FMEA fala-se em índice; depois da classificação FMEA e no PGR, em risco.

## O que vai para o PGR

O PGR recebe somente as situações inerentes à função, cada uma com índice próprio por setor (Eixo 1 da pergunta × Eixo 2 da questão × Eixo 3 da situação). A situação entra no PGR quando esse índice passa de 3,00. Os demais fatores, mesmo acima de 4,00, vão para o plano de ação, fora do PGR.

| Nº | Situação | Fator |
|---|---|---|
| 8 | Trabalho monótono: Repetitividade, estereotipia, padrão sonoro | 2. Demandas de Trabalho |
| 10 | Baixas demandas de trabalho / subutilização | 2. Demandas de Trabalho |
| 12 | Sequência de execução e/ou modo operatório imposto | 3. Controle e Autonomia |
| 13 | Ritmo imposto por processo contínuo sem pausas | 4. Ritmo e Cadência |
| 31 | Contato habitual com pessoas em sofrimento (saúde, social, educação) | 12. Tarefas com Exposição a Situações Extremas |
| 32 | Exposição a eventos traumáticos (morte, violência, acidentes graves) | 12. Tarefas com Exposição a Situações Extremas |
| 33 | Exposição frequente ou contínua a situações com possibilidade de acidente grave ou dano à integridade física | 12. Tarefas com Exposição a Situações Extremas |
| 34 | Trabalho realizado de forma constante ou predominante em isolamento físico ou remoto | 13. Trabalho Isolado ou Remoto |

## Matriz FMEA — classificação dos riscos e prioridade

Todo item acima de 3,00 (situações do PGR e fatores do plano de ação) é classificado por Severidade (S) × Ocorrência (O) × Detecção (D), cada um de 1 a 5.

- S · Severidade: severidade-base do fator (tabela abaixo) + 1 para cada agravante no setor, até 5 — atestado relacionado ao trabalho; afastamento acima de 15 dias; 50% ou mais dos respondentes expostos.
- O · Ocorrência (média do Eixo 1): até 1,80 → 1 · 1,81 a 2,60 → 2 · 2,61 a 3,40 → 3 · 3,41 a 4,20 → 4 · acima de 4,20 → 5.
- D · Detecção (fator do Eixo 2): ×0,80 · controles eficazes → 1 · ×0,81 a ×0,85 → 2 · ×0,86 a ×0,90 · precisam melhorar → 3 · ×0,91 a ×0,95 → 4 · ×0,96 a ×1,00 · inexistentes ou sem avaliação do Eixo 2 → 5.
- Prioridade: matriz S × O; detecção 4–5 sobe um nível e detecção 1 desce um (severidade 5 nunca abaixo de Média). RPN = S × O × D desempata.

| S \ O | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| S5 | Média | Alta | Alta | Alta | Alta |
| S4 | Baixa | Média | Média | Alta | Alta |
| S3 | Baixa | Baixa | Média | Média | Alta |
| S2 | Baixa | Baixa | Baixa | Média | Média |
| S1 | Baixa | Baixa | Baixa | Baixa | Média |

| Fator | Severidade-base |
|---|---|
| 1. Instrução de Trabalho | 2 |
| 2. Demandas de Trabalho | 3 |
| 3. Controle e Autonomia | 3 |
| 4. Ritmo e Cadência | 3 |
| 5. Horários e Jornada | 4 |
| 6. Segurança no Emprego | 3 |
| 7. Gestão de Mudanças | 2 |
| 8. Relações Interpessoais | 3 |
| 9. Liderança | 3 |
| 10. Equilíbrio Trabalho-Vida | 3 |
| 11. Violência no Trabalho | 5 |
| 12. Tarefas com Exposição a Situações Extremas | 5 |
| 13. Trabalho Isolado ou Remoto | 3 |

| Prioridade | Prazos (contados da emissão) |
|---|---|
| Alta | plano em 30 dias · medidas em 90 dias · reavaliar em 6 meses |
| Média | plano em 90 dias · medidas em 180 dias · reavaliar em 12 meses |
| Baixa | manter e monitorar os controles · reavaliar em 24 meses |

## Anonimato e proteção de dados (LGPD)

- O colaborador acessa a pesquisa por um código impresso, sem login, nome ou e-mail; o código é retirado do endereço da página assim que é lido.
- Setor, departamento ou filtro com menos de 3 respostas não tem resultado exibido ("amostra insuficiente") e fica fora do índice, da FMEA e do PGR.
- Quando um único grupo é escondido, o segundo menor também é, para impedir a dedução por subtração.
- O horário individual de resposta nunca é exibido nem exportado.
- O Eixo 3 não aceita identificação do trabalhador; os relatórios mostram apenas indicadores agregados por setor.
- A pré-pesquisa de perfil (quando aplicada) usa faixas para idade, peso e altura; a empresa vê apenas os totais, separados do questionário.
