# Metodologia e cálculos

Toda a matemática fica em poucos arquivos, para que nenhuma tela calcule "por conta própria":

| Cálculo | Arquivo |
|---|---|
| Eixo 1 e Score Base | `src/lib/dashboard.ts` |
| Eixo 2 | `src/lib/eixo2.ts` |
| Eixo 3 e correspondência de CID | `src/lib/eixo3.ts` |
| Risco final, nota e conclusão | `src/lib/score-final.ts` |
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

### Score Base (painel da pesquisa)
Leitura do Eixo 1 isolado, numa escala em que maior é melhor:

```
Score Base = 100 + 175 × (5 − média)      → 1 vale 800, 5 vale 100
```

A classificação usa **a mesma régua do Painel FRPRT** (função `concluir`, aplicada à média):
até 3,00 sem risco (nota 450 ou mais) · até 4,00 atenção (nota 275 ou mais) · acima, risco alto.

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

- Quantidade, dias de afastamento e casos inconclusivos não mudam o score. Aparecem como
  indicadores.
- **Correspondência do CID** com a matriz "Fatores × CID F":
  - CIDs listados explicitamente na matriz com subcódigo (F43.1, F48.0, F48.8, F51.2) casam **só**
    com os fatores que os listam. Ex.: F43.1 agrava apenas Violência e Situações extremas.
  - Os demais casam pela categoria de 3 caracteres (F41.1 → F41; F43.2 → F43).
  - CIDs sem correspondência (ex.: F20, F31, F10, F51.0) não agravam nada e são sinalizados.
  - A situação "Não específico" nunca é alvo de agravamento automático.
- O CID **não comprova nexo causal** sozinho: é um indicador agravante coletivo do setor.

## Risco final, nota e conclusão

```
Risco final = Eixo 1 × Fator Eixo 2 × Fator Eixo 3
Nota        = 100 + 175 × (5 − risco final)      (limitada a 100…1000)
```

| Risco final | Nota | Conclusão | Encaminhamento |
|---|---|---|---|
| até 3,00 | 450 ou mais | Sem risco indicado | Sem inclusão automática |
| 3,01 a 4,00 | 275 a 448 | Perigo com controle existente | Acompanhar e manter controle |
| acima de 4,00 | abaixo de 275 | Risco existente | Plano de ação + inclusão no PGR |

A comparação é feita em centésimos (3,00 calculado nunca "escorrega" para a faixa seguinte).

**Agregações**
- Risco do setor = média dos fatores com dado.
- Resultado geral da empresa = média simples dos setores com score.
- Efeitos mostrados em pontos no painel (sem mudar a conta multiplicativa):
  Eixo 2 = `E1 × F2 − E1`; Eixo 3 = `E1 × F2 × F3 − E1 × F2`.
- "Principais fatores" = % de setores em que o fator ficou acima de 3,00 (desempate pela média).

> **Uma régua só.** O Score Base (painel da pesquisa) e o Painel FRPRT classificam pelos mesmos
> cortes e pela mesma função. A diferença entre as telas é só o que entra no número: o Score Base
> usa apenas o Eixo 1; o Painel FRPRT aplica também os Eixos 2 e 3.

## Anonimato (regras que valem para todos os cálculos)

- Grupo (setor, departamento) com menos respostas que o limite da pesquisa (padrão **5**) não tem
  nota exibida: "amostra insuficiente".
- Se só um grupo for suprimido, o segundo menor também é, para impedir a dedução por subtração.
- Horário individual de resposta nunca é exibido nem exportado.
- No Eixo 3 não há nenhum identificador de trabalhador.

## Exemplo

Produção · Horários e jornada: Eixo 1 = 3,70; sem medida de controle (×1,00); um atestado F51.2
relacionado ao trabalho (×1,10).
3,70 × 1,00 × 1,10 = **4,07** → nota **263** → **risco existente**, vai para o PGR.
Sem o atestado, ficaria em 3,70 (atenção).
