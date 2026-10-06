# Manual de uso

Acesso: **https://pesquisa.agtrade.com.br/login** (admin e gestor). O colaborador nunca faz login.

---

## 1. Administrador da plataforma

### 1.1 Cadastrar uma empresa
**Empresas → + Nova empresa**
- **Nome** da empresa.
- **Logo** (PNG, JPEG ou WebP, até 2 MB). O formato é conferido pelo conteúdo do arquivo; SVG é
  recusado por segurança.
- **Cor primária e cor secundária** (opcionais). A primária pinta a faixa do topo, o botão ativo do
  menu e os botões principais; a secundária, a faixa do menu e áreas de fundo. Sem cores, a
  plataforma usa o tema cinza padrão. O texto sobre a cor primária fica branco ou escuro
  automaticamente, conforme o contraste.
- **Gestor responsável** (nome, e-mail e senha inicial).

### 1.2 Editar ou inativar uma empresa
Clique no nome da empresa na lista. Dá para trocar nome, logo e cores, e inativar. O gestor de
uma empresa inativa não consegue entrar.

### 1.3 Redefinir a senha do gestor
Na tela de edição da empresa, quadro **Redefinir senha do gestor**. Informe a nova senha e repasse ao gestor.

### 1.4 Acessar como gestor
Na lista de empresas, o ícone de seta **Acessar como gestor desta empresa** abre a área do gestor
daquela empresa. Uma faixa amarela no topo lembra que você está na visão de gestor; use
**Sair e voltar para admin** para retornar.

### 1.5 Pesos das perguntas
**Pesos das perguntas** — define o peso de cada pergunta no Eixo 1 e de cada questão no Eixo 2
(padrão 1). Vale para todas as empresas. Só o administrador da plataforma pode alterar.

---

## 2. Gestor da empresa

O menu do gestor tem: **Pesquisas · Setores e departamentos · Eixo 2 · Eixo 3 · Painel FRPRT**.
A ordem recomendada de trabalho é a do menu.

### 2.1 Setores e departamentos
- Cadastre um a um ou **importe pela planilha modelo** (botão de download na própria tela).
- Informe o **nº de colaboradores** de cada setor. Ele é usado para calcular a participação na
  pesquisa e a taxa de atestados no painel.

### 2.2 Criar uma pesquisa (Eixo 1)
**Pesquisas → + Nova pesquisa**: nome, quantidade de licenças, data/hora de início e de
encerramento.

Na página da pesquisa:
1. **Gerar licenças e códigos de acesso** — cria um código por licença e mais 5% de **códigos de teste** (arredondado
   para cima). Os códigos de teste servem para conferir a pesquisa antes de distribuir e **nunca
   entram nos resultados**.
2. **Baixar cartões em PDF (com QR code)** — um cartão por código, com logo, link e QR Code, pronto para imprimir
   e entregar.
3. Durante a vigência, acompanhe a participação em **Ver painel**.

O **status** da pesquisa é atualizado sozinho: *Rascunho* (licenças ainda não geradas), *Agendada*
(antes do início), *Aberta* (dentro do período) e *Encerrada* (depois do encerramento).

Regras de acesso do colaborador:
- Antes do início, o código não funciona.
- Depois do encerramento, quem não começou não entra; quem já começou tem 60 minutos de tolerância
  para terminar.
- Código concluído não pode ser respondido de novo.

### 2.3 Painel e relatório da pesquisa
Mostra o **Score Base** (só Eixo 1, escala 100–800, quanto maior melhor, com a mesma régua de cores
do Painel FRPRT: 450 ou mais baixo risco (verde), 275 ou mais médio risco (amarelo), abaixo alto risco (vermelho)), participação, resultados
por fator, por setor e por departamento, e **Baixar relatório (PDF)**.
Setores ou departamentos com menos de 5 respostas aparecem como **amostra insuficiente**. Isso
protege o anonimato e não pode ser desligado.

### 2.4 Eixo 2 · Medidas de controle
**Eixo 2 → + Nova avaliação**
1. **Confirme os setores** avaliados.
2. Para cada situação do questionário, marque a condição da medida de controle **para todos os
   setores**: *Existente e eficaz*, *Existente, precisa melhorar*, *Inexistente* ou *Não se aplica*.
3. Se algum setor for diferente, **abra uma exceção** só para ele.
4. Registre o **plano de ação** quando a medida precisar melhorar ou não existir.
5. **Salvar** ou **Concluir** a qualquer momento. Depois de concluída, a avaliação pode ser
   reaberta para edição.

O **Resultado** mostra o fator de cada setor × fator de risco (×0,80 a ×1,00).

### 2.5 Eixo 3 · Atestados CID-F
**Eixo 3 → Baixar modelo da planilha** e preencha uma linha por ocorrência: setor, CID-F,
descrição, data de início, dias afastados, relação com o trabalho (*Sim / Não / Inconclusivo*) e
justificativa. **Não inclua nome, matrícula ou CPF.** Colunas desse tipo são ignoradas e a tela
avisa.

**Eixo 3 → + Publicar planilha**
1. **Identificação** — nome do levantamento e período analisado.
2. **Envio da planilha** (.xlsx, até 5 MB e 5.000 linhas). Linhas com erro são listadas. Corrija
   na planilha e reenvie, porque o rascunho é substituído.
3. **Setores da planilha** — nomes iguais aos cadastrados são associados sozinhos. Para os demais,
   escolha um setor existente, crie o setor ou ignore as linhas.
4. **Publicar** — informe responsável e cargo e aceite a **declaração de veracidade**. Publicado
   fica só leitura e pode ser reaberto.

O painel do levantamento mostra ocorrências por setor, CIDs mais frequentes, a matriz setor × fator
com os agravamentos (×1,10) e alertas (casos inconclusivos, F43.1, CIDs sem correspondência).

### 2.6 Painel FRPRT
Junta os três eixos. Em **Fontes e filtros** escolha a pesquisa, a avaliação do Eixo 2 e o
levantamento do Eixo 3 (o padrão é o mais recente de cada), e filtre por setor ou departamento.

O que aparece, nesta ordem:
1. **Resultado geral da empresa** — risco, cor, descrição, nota e régua.
2. **Pontuação dos setores** — um cartão por setor.
3. **Painel resumido por setor** — tabela com as barras de cada eixo e o score final.
4. **Principais achados** — frases curtas, fatores mais apontados e tratativas sugeridas.
5. **Matriz de decisão** — cada fator de cada setor com conclusão e encaminhamento.
6. **Riscos que vão para o PGR** — consequências possíveis, CIDs compatíveis, observação técnica
   e plano de ação.

**Baixar relatório (PDF)** gera o mesmo conteúdo para anexar ao PGR. Como ler os números: veja o
[Guia rápido do Score](score-frprt.html).

---

## 3. Colaborador

1. Abre o link do cartão (ou lê o QR Code) e digita o **código**.
2. Escolhe o **setor** e o **departamento**. Isso serve só para agrupar resultados.
3. Responde o questionário, página por página. Pode parar e voltar com o mesmo código enquanto a
   pesquisa estiver aberta.
4. Conclui. Depois disso o código não aceita nova resposta.

Nenhum dado pessoal é pedido ou guardado.
