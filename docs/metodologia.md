# Metodologia e cálculos

Toda a matemática fica em poucos arquivos, para que nenhuma tela calcule "por conta própria":

| Cálculo | Arquivo |
|---|---|
| Eixo 1 (médias e faixa) | `src/lib/dashboard.ts` |
| Eixo 2 | `src/lib/eixo2.ts` |
| Eixo 3 e correspondência de CID | `src/lib/eixo3.ts` |
| Índice final e conclusão | `src/lib/score-final.ts` |
| FMEA (S, O, D, prioridade e prazos) | `src/lib/fmea.ts` |
| Painel FRPRT (cruzamento) | `src/lib/painel-frprt.ts` |
| Supressão de grupos pequenos | `src/lib/agregacao.ts` |

## Unidade de análise

**Setor × fator de risco.** O questionário v2 tem 35 perguntas em 13 fatores (dimensões):
1 Instrução de trabalho · 2 Demandas · 3 Controle e autonomia · 4 Ritmo e cadência · 5 Horários e
jornada · 6 Segurança no emprego · 7 Gestão de mudanças · 8 Relações interpessoais · 9 Liderança ·
10 Equilíbrio trabalho-vida · 11 Violência no trabalho · 12 Situações extremas · 13 Trabalho
isolado ou remoto.

As perguntas do Eixo 2 e as linhas da matriz CID (Eixo 3) são ligadas 1:1 às perguntas do v2.
O questionário v1 (42 perguntas) fica inativo e não entra no Painel FRPRT.

## Eixo 1 — Percepção

- Respostas em escala de 1 a 5. Perguntas positivas são invertidas para que **1 = melhor** e
  **5 = pior** em todas.
- Média **ponderada pelos pesos** configurados pelo admin (padrão 1).
- Só entram respostas **concluídas** de códigos de **participante** (códigos de teste e
  rascunhos ficam de fora).

### Índice do Eixo 1 (painel da pesquisa)
O painel da pesquisa mostra a própria média de 1 a 5 como **índice**, com a **mesma régua do Painel
FRPRT** (função `concluir`): até 3,00 baixo risco (verde) · 3,01 a 4,00 médio risco (amarelo) ·
acima de 4,00 alto risco (vermelho).

> A antiga escala de notas 100–1000 ("Score Base") foi retirada do sistema em outubro de 2026: era
> só uma conversão do índice e não entrava em nenhum cálculo.

## Eixo 2 — Medidas de controle

| Condição da medida | Valor |
|---|---|
| Existente e eficaz / Não se aplica | 0,80 |
| Existente, precisa melhorar | 0,90 |
| Inexistente | 1,00 |

**Fator Eixo 2 (setor × fator)** = média ponderada das medidas daquele fator no setor.
Setor sem avaliação → ×1,00.

## Eixo 3 — Atestados CID-F

**Fator Eixo 3 (setor × fator)** = **×1,10** se houve no período **pelo menos uma** ocorrência com
relação ao trabalho = **Sim**, no setor, com CID compatível com o fator. Caso contrário, **×1,00**.

- Quantidade, dias de afastamento e casos inconclusivos não mudam o índice. Aparecem como
  indicadores (os dias de afastamento entram na severidade da FMEA).
- **Correspondência do CID** com a matriz "Fatores × CID F":
  - CIDs listados explicitamente na matriz com subcódigo (F43.1, F48.0, F48.8, F51.2) casam **só**
    com os fatores que os listam. Ex.: F43.1 agrava apenas Violência e Situações extremas.
  - Os demais casam pela categoria de 3 caracteres (F41.1 → F41; F43.2 → F43).
  - CIDs sem correspondência (ex.: F20, F31, F10, F51.0) não agravam nada e são sinalizados.
  - A situação "Não específico" nunca é alvo de agravamento automático.
- O CID **não comprova nexo causal** sozinho: é um indicador agravante coletivo do setor.

## Índice final e conclusão

```
Índice final = Eixo 1 × Fator Eixo 2 × Fator Eixo 3      (escala 1–5, quanto maior, pior)
```

| Índice final | Faixa | Conclusão | Encaminhamento |
|---|---|---|---|
| até 3,00 | Baixo risco (verde) | Sem risco indicado | Sem inclusão automática |
| 3,01 a 4,00 | Médio risco (amarelo) | Perigo com controle existente | Acompanhar e manter controle |
| acima de 4,00 | Alto risco (vermelho) | Risco existente | Plano de ação + inclusão no PGR |

A comparação é feita em centésimos (3,00 calculado nunca "escorrega" para a faixa seguinte).

**Agregações**
- Risco do setor = média dos fatores com dado.
- Resultado geral da empresa = média simples dos setores com score.
- Efeitos mostrados em pontos no painel (sem mudar a conta multiplicativa):
  Eixo 2 = `E1 × F2 − E1`; Eixo 3 = `E1 × F2 × F3 − E1 × F2`.
- "Principais fatores" = % de setores em que o fator ficou acima de 3,00 (desempate pela média).

> **Uma régua só.** O painel da pesquisa e o Painel FRPRT classificam pelos mesmos cortes e pela
> mesma função. A diferença é só o que entra no número: o painel da pesquisa usa apenas o Eixo 1;
> o Painel FRPRT aplica também os Eixos 2 e 3.

## FMEA — prioridade de ação para o PGR

Os fatores com índice acima de 3,00 são classificados por **Severidade (S) × Ocorrência (O) ×
Detecção (D)**, em duas listas: **acima de 4,00** (plano de ação no PGR) e **3,01 a 4,00**
(acompanhamento). Proposta completa e fontes: [proposta-fmea.html](proposta-fmea.html).

**S · Severidade (1–5)** = severidade-base do fator + agravantes no setor (+1 cada, até 5):
- atestado CID-F com relação ao trabalho = **Sim** e compatível com o fator;
- um desses afastamentos com **mais de 15 dias** (sem relação com o trabalho não conta);
- **50% ou mais** dos respondentes do setor com média individual **4 ou mais** no fator.

A severidade-base é parte da metodologia (única para todas as empresas), fica na tabela
`SeveridadeFator` e é editada pelo admin em **Severidade dos fatores (FMEA)**, com justificativa.
Valores iniciais: 5 Violência e Situações extremas · 4 Horários e jornada · 2 Instrução de trabalho
e Gestão de mudanças · 3 os demais.

**O · Ocorrência** (média do Eixo 1): até 1,80 → 1 · até 2,60 → 2 · até 3,40 → 3 · até 4,20 → 4 ·
acima → 5.

**D · Detecção e controle** (fator do Eixo 2): ×0,80 → 1 · até ×0,85 → 2 · até ×0,90 → 3 · até ×0,95 → 4 ·
acima, ou setor sem avaliação → 5.

**Prioridade** (padrão AIAG-VDA 2019, severidade pesa mais): matriz S × O dá o nível base;
D 4–5 sobe um nível; D 1 desce um (severidade 5 nunca abaixo de Média). RPN = S × O × D (1–125)
desempata.

| | O 1 | O 2 | O 3 | O 4 | O 5 |
|---|---|---|---|---|---|
| **S 5** | Média | Alta | Alta | Alta | Alta |
| **S 4** | Baixa | Média | Média | Alta | Alta |
| **S 3** | Baixa | Baixa | Média | Média | Alta |
| **S 2** | Baixa | Baixa | Baixa | Média | Média |
| **S 1** | Baixa | Baixa | Baixa | Baixa | Média |

**Prazos** (datas contadas da emissão do relatório): Alta — plano em 30 dias, medidas em 90,
reavaliar em 6 meses · Média — plano em 90 dias, medidas em 180, reavaliar em 12 meses · Baixa —
manter os controles, reavaliar em 24 meses.

O relatório PDF traz a página da Matriz FMEA e uma página com estes critérios documentados
(NR-1, item 1.5.4.4.2).

## Anonimato (regras que valem para todos os cálculos)

- Grupo (setor, departamento) com menos respostas que o limite da pesquisa (padrão **5**) não tem
  índice exibido: "amostra insuficiente". O % de expostos da FMEA só é calculado nesses mesmos
  setores com amostra suficiente.
- Se só um grupo for suprimido, o segundo menor também é, para impedir a dedução por subtração.
- Horário individual de resposta nunca é exibido nem exportado.
- No Eixo 3 não há nenhum identificador de trabalhador.

## Exemplo

Produção · Horários e jornada: Eixo 1 = 3,70; sem medida de controle (×1,00); um atestado F51.2
relacionado ao trabalho (×1,10).
3,70 × 1,00 × 1,10 = **4,07** → **alto risco**, vai para o PGR. Sem o atestado, ficaria em 3,70
(médio risco).

FMEA desse item: severidade-base 4 + 1 (atestado relacionado) = **S 5**; média 3,70 → **O 4**;
sem controle → **D 5**. Matriz S5 × O4 = Alta; D 5 mantém Alta → **prioridade Alta**, RPN 100:
plano de ação em até 30 dias.
