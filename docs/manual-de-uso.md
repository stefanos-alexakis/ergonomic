# Manual de uso

Acesso: **https://pesquisa.agtrade.com.br/login** (admin e gestor). O colaborador nunca faz login.

---

## 1. Administrador da plataforma

**Buscar empresa.** Na lista de **Empresas**, o campo de busca filtra pelo nome: digite uma parte (sem se preocupar com
maiúsculas ou acentos) e só as empresas que contêm o trecho aparecem; **Limpar** volta à lista inteira.

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

### 1.2 Editar, inativar ou excluir uma empresa
Clique no nome da empresa na lista. Dá para trocar nome, logo e cores, e inativar. Na própria lista,
ao lado do status, os botões **inativar** / **ativar** mudam o status direto. O gestor de uma empresa
inativa não consegue entrar.

**Excluir** fica no fim da tela de edição e só aparece com a empresa **inativa**. A tela mostra tudo o
que será apagado (pesquisas e respostas, Eixos 2 e 3, plano de ação, setores, logo e os gestores que
só pertencem a ela) e pede que você digite o nome da empresa. A exclusão é definitiva.

### 1.3 Redefinir a senha do gestor
Na tela de edição da empresa, quadro **Redefinir senha do gestor**. Informe a nova senha e repasse ao gestor.

### 1.4 Acessar como gestor
Na lista de empresas, o ícone de seta **Acessar como gestor desta empresa** abre a área do gestor
daquela empresa. Uma faixa amarela no topo lembra que você está na visão de gestor; use
**Sair e voltar para admin** para retornar.

### 1.5 Pesos das perguntas
**Pesos das perguntas** — define o peso de cada pergunta no Eixo 1 e de cada questão no Eixo 2
(padrão 1). Vale para todas as empresas. Só o administrador da plataforma pode alterar.

### 1.6 Severidade dos fatores (FMEA)
**Severidade dos fatores (FMEA)** — define a severidade-base de cada um dos 13 fatores (1 a 5) e a
justificativa técnica. É parte da metodologia: vale para todas as empresas, entra na Matriz FMEA do
Painel FRPRT e aparece no relatório como critério documentado. Deve refletir a validação do
profissional de SST responsável. Só o administrador da plataforma pode alterar.

### 1.7 Prazos padrão
**Prazos padrão** — prazos sugeridos para cada prioridade da FMEA (plano de ação e medidas em dias,
reavaliação em meses, até 24 meses como pede a NR-1). Valem para todas as empresas: aparecem no
Painel FRPRT quando o fator ainda não tem ação e preenchem os prazos iniciais das ações geradas no
Plano de ação. Só o administrador da plataforma pode alterar.

### Consultoria
A consultoria trabalha na empresa pelo **Acessar como gestor** e edita o Plano de ação com o próprio
usuário. O histórico de cada ação registra o nome com a marca "(consultoria)".

---


### 1.8 Consultores, responsáveis e textos do relatório
- **Responsáveis do relatório (por empresa)** — pessoas que só constam e assinam o relatório completo; não são
  usuários da plataforma. Ficam em **Editar empresa → Responsáveis do relatório**: área/função, nome,
  especialidade, descritivo, empresa, e-mail e celular. Em cada linha marque **Consta no próximo relatório** e
  defina a **Ordem** (1, 2, 3…); salve tudo de uma vez. A marca continua ligada depois de emitir. No PDF saem, na
  ordem, abaixo dos consultores, com e-mail e celular. Mudar o cadastro depois não altera versões já emitidas.
- **Consultores** — quem assina o relatório completo: nome, formação, registro profissional, cargo e
  e-mail. Vale para todas as empresas. Relatórios já emitidos guardam uma cópia dos dados: editar ou
  excluir o consultor não os altera.
- **Textos do relatório** — o dossiê da legislação. Enquanto estiver vazio, o relatório mostra "em
  elaboração". Linha em branco separa parágrafos; "# " vira subtítulo e "- " vira item de lista.
- A **metodologia** do relatório é gerada pelo sistema com as regras vigentes (mínimo de respostas,
  prazos, severidades e situações do PGR). O mesmo texto está em `docs/metodologia-final.md`
  (gerado por `npx tsx scripts/gerar-metodologia.ts`).

## 2. Gestor da empresa

O topo tem os três eixos: **Eixo 1 · Pesquisa com os colaboradores**, **Eixo 2 · Medidas de controle** e
**Eixo 3 · Atestados CID**. O botão **Menu** (à esquerda) abre uma gaveta com o restante, por categoria:
**Cadastro** (Setores e departamentos), **Relatórios** (Relatórios Eixo 1, Relatórios Eixo 2 e Painel FRPRT) e **Gestão** (Plano de ação).

### 2.1 Setores e departamentos
- Cadastre um a um ou **importe pela planilha modelo** (botão de download na própria tela).
- Informe o **nº de colaboradores** de cada setor. Ele é usado para calcular a participação na
  pesquisa e a taxa de atestados no painel.

### 2.2 Criar uma pesquisa (Eixo 1)
**Eixo 1 · Pesquisa com os colaboradores → + Nova pesquisa**: nome, quantidade de licenças, data/hora de início e de
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

**Lista de pesquisas.** Na tela do Eixo 1 há as abas **Abertas** (em operação: rascunho, agendada ou em andamento),
**Concluídas** (o encerramento já passou) e **Arquivadas**, além de **Todas**, cada uma com a contagem.

**Prorrogar, arquivar ou excluir** (link na página da pesquisa):
- **Encerramento** — dá para prorrogar mesmo depois de emitir os cartões; a pesquisa reabre e os códigos ainda não
  usados voltam a funcionar. Depois que houver respostas, só é possível prorrogar, não antecipar.
- **Arquivar** — a pesquisa para de receber respostas e sai da lista de trabalho, do Painel FRPRT e do relatório
  completo; os dados continuam consultáveis. Dá para desarquivar.
- **Excluir** — se nenhum código de participante foi usado (os de teste não contam), exclui direto, com uma confirmação.
  Se já foi iniciada, o pedido exige digitar o nome da pesquisa e **não exclui na hora**: ela fica arquivada por 30 dias
  (dá para cancelar o pedido) e só depois libera a **exclusão definitiva**, com nova confirmação por escrito. A exclusão
  apaga códigos, respostas e pré-pesquisa; os relatórios já emitidos continuam arquivados.

Regras de acesso do colaborador:
- Antes do início, o código não funciona.
- Depois do encerramento, quem não começou não entra; quem já começou tem 60 minutos de tolerância
  para terminar.
- Código concluído não pode ser respondido de novo.


### 2.2.1 Vídeo, texto de orientação e pré-pesquisa
Na criação da pesquisa (ou depois, em **Editar orientação e pré-pesquisa**, na página da pesquisa):

- **Vídeo orientativo:** cole o link do YouTube (qualquer formato: `youtube.com/watch?v=…`, `youtu.be/…`,
  `shorts/…`). Outros sites são recusados. O vídeo é exibido no modo de privacidade do YouTube.
- **Texto de orientação:** texto simples, até 3.000 caracteres.
- Vídeo e texto aparecem no topo da tela **Onde você trabalha**, que todo colaborador vê uma vez antes do
  questionário.
- **Exibir a pré-pesquisa:** 8 perguntas de perfil (tempo de empresa, idade, sexo, peso, altura, bebidas,
  outra atividade remunerada, apostas). Quando ligada, é **obrigatória**: não há botão de pular e todas
  as perguntas precisam de resposta; só a pergunta sobre sexo tem "Prefiro não responder". Idade, peso e
  altura são perguntados em faixas. Se for ligada com a coleta em andamento, quem já começou o
  questionário não a vê.
- **Resultado:** no painel da pesquisa e no relatório PDF, o quadro **Perfil dos participantes** mostra só os
  totais da pesquisa inteira, separados do questionário, e fica oculto com menos de 3 pré-pesquisas. O
  cruzamento com setor e com o índice do Eixo 1 existe só na área do administrador
  (**Pré-pesquisa (cruzamentos)**).

### 2.3 Painel e relatório da pesquisa
Mostra o **índice geral do Eixo 1** (média de 1 a 5, quanto maior, mais exposição), com a mesma
régua de cores do Painel FRPRT: até 3,00 índice baixo (verde), até 4,00 índice médio (amarelo), acima
índice alto (vermelho). Também mostra participação, resultados
por fator, por setor e por departamento, e **Baixar relatório (PDF)**.
Setores ou departamentos com menos de 3 respostas aparecem como **amostra insuficiente**. Isso
protege o anonimato e não pode ser desligado.

**Atalho para todos os painéis:** menu **Relatórios → Relatórios Eixo 1** (ou o link *Ver todos os relatórios* no
Eixo 1) abre a página *Relatórios Eixo 1 · Pesquisas Colaboradores*, com uma linha por pesquisa: nome, período,
respostas concluídas (de quantos códigos), status e **Abrir painel**. Pesquisa que ainda não tem respostas
suficientes aparece sem link, com "Aguardando respostas". Arquivadas e com exclusão solicitada não aparecem.
Os painéis continuam dentro de cada pesquisa; a página é só um atalho.


**Distribuição das respostas (pergunta a pergunta)** — botão no painel da pesquisa. Mostra, para cada
uma das 35 perguntas, agrupadas pelos 13 fatores, quantas pessoas marcaram cada opção (Nunca a Sempre)
e o % de expostos, com o índice do fator ao lado. Filtro por setor ("Todos os setores" por padrão);
setores abaixo do mínimo de respostas não aparecem separados. Em vermelho, as perguntas em que 50% ou
mais marcaram Frequentemente ou Sempre (definição de exposto da metodologia). **Baixar Excel** gera
uma aba "Todos" e uma aba por setor.
### 2.4 Eixo 2 · Medidas de controle
**Eixo 2 → + Nova avaliação**
1. **Confirme os setores** avaliados.
2. Para cada situação do questionário, marque a condição da medida de controle **para todos os
   setores**: *Existente e eficaz*, *Existente, precisa melhorar*, *Inexistente* ou *Não se aplica*.
3. Se algum setor for diferente, **abra uma exceção** só para ele.
4. Registre o **plano de ação** quando a medida precisar melhorar ou não existir.
5. **Salvar** ou **Concluir** a qualquer momento. Depois de concluída, a avaliação pode ser
   reaberta para edição.

O **Resultado** mostra o fator de cada setor × fator de risco (×0,80 a ×1,00). No topo há um resumo: o
**índice de controle (%)** é o mesmo fator em porcentagem (×0,80 = 100%, ×1,00 = 0%). O botão **Entenda o score
do Eixo 2** abre uma página de explicação, igual para todas as empresas (o que é o Eixo 2, avaliação por setor,
valor de cada resposta, como o multiplicador atenua o risco e que sem medida o fator fica 1,00).

**Atalho:** menu **Relatórios → Relatórios Eixo 2** (ou o link *Ver todos os relatórios* no Eixo 2) lista as
avaliações com data, setores, status e os links *Ver resultado* e *Ver respostas* (em preenchimento:
*Resultado parcial* e *Continuar preenchendo*). Só um atalho: as avaliações continuam no Eixo 2.

**Etapa final — Sinais de exposição (ISO 45003, item 8.1.2.5).** Depois das 13 dimensões há uma etapa
com 9 sinais que o líder de cada setor pode identificar nos colaboradores (mudanças de comportamento,
isolamento, afastamentos, falta de engajamento, energia reduzida, rotatividade, desempenho, baixo
desejo de trabalhar com outras pessoas, conflitos). O consultor preenche na mesma entrevista:
- O padrão é **Nunca** em todos os setores, sem precisar marcar nada.
- Só quando o líder reconhece o sinal, marque **Sinal identificado** naquele setor: abre a escala
  (*Nunca, Raramente, Às vezes, Frequentemente, Sempre*). Escolher *Nunca* volta ao padrão.
- No fim, clique em **Confirmo a revisão dos sinais** (vale também quando nenhum sinal foi
  identificado). Sem essa confirmação a avaliação não conclui. Se um setor entrar na avaliação
  depois, a confirmação precisa ser refeita.
- O **Resultado** mostra a matriz setor × sinal (Frequentemente e Sempre em destaque) e um Excel.
  É um indicador à parte: **não entra** no fator do Eixo 2, no índice final nem no relatório em PDF.
  Avaliações concluídas antes desta etapa aparecem como "não avaliado".

### 2.5 Eixo 3 · Atestados CID
**Eixo 3 → Baixar modelo da planilha** e preencha uma linha por ocorrência: setor, CID (F ou Z),
descrição, data de início, dias afastados, relação com o trabalho (*Sim / Não / Inconclusivo*),
justificativa e **matrícula** (opcional). **Não inclua nome nem CPF** — colunas desse tipo são
ignoradas e a tela avisa. A matrícula serve para contar *colaboradores com atestado* (a mesma
matrícula conta uma vez por setor; linha sem matrícula conta como uma pessoa) e mostrar a
reincidência. Ela aparece só na tela do Eixo 3, nunca nos relatórios nem nas planilhas geradas.

**CIDs do capítulo Z** também são aceitos (o modelo traz a aba *CIDs Z aceitos*). Alguns agravam fatores como os
CID F (grupo A), outros só contam nos indicadores (grupo B) e os de agentes físicos (ruído, vibração, fumaça) ficam
fora do FRPRT, com aviso para tratar no PGR de riscos físicos (grupo C). O painel mostra F e Z separados e alertas
para uso de substâncias, histórico de lesão autoprovocada e agentes físicos. Os códigos mais sensíveis aparecem só
em números agregados, sem a linha individual.

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
1. **Resultado geral da empresa** — índice, cor, descrição e régua.
2. **Pontuação dos setores** — um cartão por setor.
3. **Painel resumido por setor** — tabela com as barras de cada eixo e o score final.
4. **Principais achados** — frases curtas, fatores mais apontados e tratativas sugeridas.
5. **Matriz FMEA — prioridade de ação** — mapa Severidade × Ocorrência e duas listas: **PGR**
   (situações inerentes à função acima de 3,00) e **fatores acima de 3,00 → plano de ação**. Cada item traz S, O, D, RPN, a
   prioridade (Alta, Média, Baixa) e as **datas** de plano, implantação e reavaliação, contadas a
   partir do dia em que o painel ou o relatório é emitido. Em "Critérios da classificação FMEA" estão
   a tabela de severidade e as regras.
6. **Matriz de decisão** — cada fator de cada setor com conclusão e encaminhamento, por setor e depois
   por fator (1–13). Quando uma situação daquele fator vai para o PGR, aparece "PGR: situação N".
7. **Riscos que vão para o PGR** — só as situações inerentes à função (marcadas "PGR" pelo
   administrador em **Pesos das perguntas**) com índice próprio no setor acima de 3,00. Os demais
   fatores, mesmo com nota alta, ficam fora do PGR e vão para o plano de ação. Na ordem da FMEA, com
   prazos, consequências possíveis, CIDs compatíveis, observação técnica e plano de ação.

**Baixar relatório (PDF)** gera o mesmo conteúdo para anexar ao PGR. Como ler os números: veja o
[Guia rápido do Score](score-frprt.html). Onde o fator já tem ação no Plano de ação, o painel e o
PDF mostram os prazos da ação; senão, a sugestão da FMEA.

### 2.7 Plano de ação (5W2H e PDCA)
Um plano contínuo da empresa, que atravessa os ciclos de pesquisa e avaliação.

**De onde vêm as ações**
- **Gerar a partir do Eixo 2** — cada plano de ação escrito no Eixo 2 vira uma ação. Planos iguais
  em vários setores (por exemplo, "responder para todos") viram **uma** ação com vários setores.
  Gerar de novo não duplica nem apaga o que foi editado, e ações canceladas não voltam. A ação já
  nasce com a prioridade da FMEA e prazos sugeridos.
- **Situações que vão para o PGR sem ação** — lista em vermelho no topo, com **Criar ação** já
  preenchida com setor, fator, situação (no "por quê") e uma tratativa sugerida. A ação criada por
  ali fica ligada à situação. Uma situação conta como coberta por ação gerada da própria questão do
  Eixo 2 ou por ação manual do mesmo fator.
- **+ Nova ação** — ação manual.

**5W2H** (todos editáveis, inclusive os prazos): o quê, por quê, onde (setores), quem (responsável e
cargo), quando (início, prazo de conclusão e data de reavaliação), como e quanto custa (R$, com
observação).

**PDCA**
1. **P · Planejar** — completar o 5W2H. Para iniciar a execução são obrigatórios responsável, prazo
   e setor.
2. **D · Executar** — registrar andamento (%) e anotações.
3. **C · Verificar** — na data de reavaliação, a ficha mostra o índice do fator no setor **antes**
   (quando a ação nasceu) e **agora** (Painel FRPRT mais recente). Registrar a eficácia: eficaz,
   parcialmente eficaz ou ineficaz.
4. **A · Agir** — eficaz: a ação é concluída (padronizar a medida, que deve entrar como "existente e
   eficaz" no próximo Eixo 2). Parcial ou ineficaz: a ação é concluída e abre-se uma **ação
   corretiva** ligada a ela, recomeçando o ciclo.

A **situação** é calculada: atrasada (prazo vencido com a ação aberta), vence em até 30 dias, no
prazo, sem prazo, concluída ou cancelada. Na verificação, vale a data de reavaliação.

**Telas e exportação**: resumo (abertas, atrasadas, a vencer, concluídas, eficazes, custo), filtros
(setor, fator, fase, situação, prioridade, busca), lista ou **quadro PDCA**, ficha com **histórico**
de quem alterou o quê, e exportação em **Excel** e **PDF** com os mesmos filtros.

Se duas pessoas editarem a mesma ação ao mesmo tempo, a segunda recebe o aviso para recarregar a
página — nada é sobrescrito sem ver.

---


### 2.8 Relatório completo
No Painel FRPRT, botão **Relatório completo**. O documento traz capa (empresa e logo), sumário, dossiê da
legislação, metodologia e anonimato, Eixo 1 por setor e fator, Eixo 2 (fatores e planos registrados),
Eixo 3 (indicadores por setor, sem identificação), as páginas do Painel FRPRT (índices, FMEA e PGR), o
plano de ação, a conclusão do consultor, os responsáveis técnicos (consultores) e os responsáveis da empresa.

- **Consultoria** (admin na visão de gestor): escolhe as fontes (mais recente, uma específica ou "não
  considerar"), escreve a conclusão, marca quem assina, **salva o rascunho** e pode **pré-visualizar**.
  **Emitir versão N** grava o PDF (os prazos da FMEA contam da data de emissão). Cada emissão é uma nova
  versão; as anteriores continuam disponíveis. A assinatura digital é feita depois, sobre o PDF emitido.
  O rascunho mostra, só para leitura, os responsáveis da empresa marcados (editados no cadastro da empresa).
- **Gestor da empresa**: vê a lista de versões emitidas e baixa os PDFs.
- O logo em WebP não aparece no PDF (formato não aceito pelo gerador): envie PNG ou JPG.

## 3. Colaborador

1. Abre o link do cartão (ou lê o QR Code) e digita o **código**.
2. Escolhe o **setor** e o **departamento**. Isso serve só para agrupar resultados.
3. Responde o questionário, página por página. Pode parar e voltar com o mesmo código enquanto a
   pesquisa estiver aberta.
4. Conclui. Depois disso o código não aceita nova resposta.

Nenhum dado pessoal é pedido ou guardado.
