# Especificação — Plataforma de Pesquisa de Riscos Psicossociais

**Status:** Draft para aprovação · **Depende de:** [constitution.md](../../.specify/memory/constitution.md)

## 1. Visão

Plataforma web multiempresa para aplicação segura, anônima e escalável de pesquisas de riscos
psicossociais (base técnica: NR-1, Portaria MTE 1.419/2024, Lei 14.457/2022, ISO 45003:2021) a
colaboradores de empresas clientes. Cada empresa opera em um workspace isolado, com identidade
visual, usuários, pesquisas, participantes e dados totalmente segregados dos demais clientes.

## 2. Perfis de acesso

### 2.1 Administrador da plataforma
Cadastra e administra empresas clientes, cria workspaces, configura identidade visual inicial e
acompanha a operação geral (todas as empresas).

### 2.2 Gestor da empresa cliente
Cria e administra pesquisas dentro do próprio workspace: define período de aplicação, cadastra
setores/departamentos/segmentos/funções, solicita licenças, gera códigos de acesso, acompanha
dashboards e relatórios. Não vê dados de outras empresas.

### 2.3 Colaborador respondente
Sem cadastro, login pessoal ou vínculo nominal com a resposta. Acessa exclusivamente via URL da
pesquisa + código anônimo recebido individualmente (cartão físico ou QR).

## 3. Cadastro de empresa e identidade visual

Ao criar uma empresa cliente, o Administrador informa: nome, logotipo, cores da marca e dados do
gestor responsável. Sem cores fornecidas, a plataforma usa um tema padrão em tons de cinza,
neutro e acessível (contraste mínimo garantido em ambos os casos — ver constituição §5).

## 4. Criação de pesquisas

Dentro do workspace, o Gestor cria pesquisas vinculadas a um questionário já cadastrado na
plataforma (ver Anexo A). Ao criar, informa: nome/identificação da pesquisa, quantidade esperada
de participantes/licenças, data/hora de início, data/hora de encerramento, e quais
setores/departamentos/segmentos/funções participarão. Essas estruturas organizacionais são
cadastradas manualmente ou importadas por planilha.

Durante o preenchimento, o colaborador seleciona suas informações organizacionais (setor,
departamento, segmento, função) — usadas apenas para análises agrupadas, nunca para identificação
individual.

## 5. Licenças e códigos anônimos de acesso

- A pesquisa funciona por códigos individuais, anônimos e de uso único.
- Ao solicitar N licenças, o sistema gera automaticamente N + 5% códigos adicionais do tipo
  `TESTE` (arredondado para cima; ex.: 100 licenças → 100 `PARTICIPANTE` + 5 `TESTE` = 105
  códigos).
- Códigos `TESTE` validam a experiência da pesquisa mas nunca entram em dashboards, indicadores
  ou relatórios oficiais (constituição §3).
- Cada código está associado a uma pesquisa e é disponibilizado com: URL da pesquisa, o código,
  indicação de tipo (participante/teste) e status (`DISPONIVEL`, `INICIADO`, `CONCLUIDO`,
  `EXPIRADO`, `BLOQUEADO`).
- O Gestor exporta/imprime os códigos individualmente, preferencialmente em formato de cartão
  (com QR code apontando para URL + código), para distribuição presencial.

## 6. Jornada do colaborador

1. Abre a URL da pesquisa (por digitação ou pelo QR do cartão). Se o acesso vier por um link que
   contenha o código, o servidor grava o código em cookie seguro e **redireciona imediatamente
   para uma URL limpa**, sem o código — para que ele não fique em histórico, logs ou cabeçalho
   `Referer` (ver `review.md` §1.2).
2. Informa o código de acesso.
3. Seleciona setor e departamento (obrigatórios) e, **opcionalmente**, segmento e função — com a
   alternativa explícita "prefiro não informar". Segmento e função costumam ser os campos que mais
   estreitam o grupo e por isso não são obrigatórios (`review.md` §1.4).
4. Responde o questionário — **paginado**: as perguntas são divididas em páginas sequenciais
   (tamanho de página configurável; Bloco 1 e Bloco 2 não se misturam na mesma página). Cada
   página tem um botão "Próximo" que avança e salva o progresso daquela página (permite retomar
   a pesquisa depois, sem expor identidade — o rascunho fica associado só ao código). Um botão
   "Voltar" permite corrigir uma página já respondida antes de concluir.
5. Ao terminar a última página, uma tela de confirmação pergunta: **"Você gostaria de revisar
   suas respostas ou quer concluir a pesquisa?"**
   - **Revisar** → volta para a lista paginada com o que já foi marcado, permitindo editar
     qualquer resposta antes de enviar.
   - **Concluir a pesquisa** → grava definitivamente as respostas, marca o código como
     `CONCLUIDO` e exibe a mensagem de agradecimento.
6. Sem essa confirmação de "Concluir", a resposta permanece rascunho (código `INICIADO`,
   retomável) até o encerramento da pesquisa.

Após a data/hora de encerramento definida pelo Gestor, a pesquisa fica automaticamente
indisponível — bloqueio aplicado no backend, sempre comparando com a data/hora atual e nunca
confiando apenas no campo de status (`review.md` §2.2). A regra separa dois casos:

- **Quem ainda não começou**: bloqueado no instante do encerramento.
- **Quem já começou** (código `INICIADO`): tem uma tolerância de **60 minutos** após o
  encerramento para concluir o que já estava respondendo, evitando perder respostas em andamento
  no meio das 42 perguntas (`review.md` §3.1).

Datas e horas são gravadas em UTC e exibidas/inseridas no fuso do workspace (padrão
`America/Sao_Paulo`, configurável).

O colaborador **nunca** vê dimensão, fator de risco ou situação investigada — apenas a pergunta
e as 5 opções de resposta (Anexo A).

## 7. Dashboards e relatórios

Após o início da coleta — e especialmente após o encerramento — o Gestor acessa dashboards com
dados agregados por empresa, pesquisa, setor, departamento, segmento e função, com indicadores
estatísticos sobre os riscos psicossociais identificados. Nenhum agregado que exponha resposta
individual ou grupo pequeno (constituição §3) é exibido. A plataforma permite gerar e imprimir
relatórios exportáveis para apoiar ações preventivas e decisões de saúde/bem-estar.

## 8. Requisitos essenciais (critérios de aceite de alto nível)

| # | Requisito | Critério testável |
|---|---|---|
| R1 | Isolamento entre empresas | Um Gestor autenticado no workspace A nunca recebe dados (via UI ou API) de workspace B, mesmo manipulando IDs na URL |
| R2 | Anonimato do respondente | Busca em todo o schema por colunas de nome/e-mail/CPF/matrícula do respondente retorna vazio |
| R3 | Uso único do código | Um código `CONCLUIDO` não consegue abrir o questionário novamente (retorna estado "já concluído", não o formulário) |
| R4 | Encerramento automático | Após `dataFim`, qualquer tentativa de acessar/continuar a pesquisa (código válido ou não) retorna "pesquisa encerrada" |
| R5 | Exclusão de testes das estatísticas | Nenhuma query de dashboard/relatório inclui `CodigoAcesso.tipo = TESTE` |
| R6 | Supressão de grupos pequenos | Um agregado com <5 respostas concluídas não aparece isolado no dashboard **e** o valor suprimido não é dedutível por subtração do total (suprimir também o segundo menor grupo) |
| R6b | Validação de dados na rota pública | Um `setorId`/`departamentoId` que não pertença ao workspace da pesquisa daquele código é rejeitado pelo backend |
| R7 | Jornada paginada com revisão | O colaborador consegue voltar/avançar entre páginas e, ao final, escolher revisar ou concluir antes do envio definitivo |
| R8 | Responsividade | A jornada do colaborador é utilizável em viewport de ~375px de largura sem quebra de layout |
| R9 | Personalização visual | Uma empresa sem cores cadastradas exibe o tema cinza padrão; uma empresa com cores cadastradas exibe essas cores na jornada do colaborador |
| R10 | Importação de estrutura organizacional | Uma planilha com setor/departamento/segmento/função é importada e os registros ficam disponíveis para seleção na pesquisa correspondente |

## 9. Fora de escopo desta especificação

- Login/identificação do colaborador respondente (contraria §1 da constituição).
- Integração com agente de IA de gestão (AlexClaw/"Salomão"/Bot Chess) — ver `research.md`,
  Fase 2.
- Emissão do laudo técnico ergonômico completo (documento profissional assinado pela
  ergonomista) — a plataforma fornece os dados agregados que **alimentam** esse laudo, não o
  laudo em si.

---

## Anexo A — Questionário oficial (fonte: `perguntas-pesquisa.xlsx`, coluna E)

Escala de resposta fixa, igual para as 42 perguntas: **1-Não/Nunca · 2-Raramente · 3-Às vezes ·
4-Frequentemente · 5-Sempre**. O colaborador vê apenas a coluna "Pergunta exibida ao colaborador".
As colunas Dimensão/Fator de risco/Situação investigada são metadados internos, nunca exibidos a
ele.

### Bloco 1 — Organização do Trabalho (25 perguntas)

| # | Dimensão | Fator de risco | Situação investigada | Pergunta exibida ao colaborador |
|---|---|---|---|---|
| 1 | 1. Instrução de trabalho | Instruções de trabalho e/ou cargo mal definidos | Ausência/desatualização de descrição de cargo formalizado | Você sente falta de clareza sobre qual é sua função ou atividade de trabalho? |
| 2 | 1. Instrução de trabalho | Instruções de trabalho e/ou cargo mal definidos | Exigências contraditórias de superiores distintos | Você recebe ordens diferentes de mais de um superior sobre a mesma tarefa? |
| 3 | 1. Instrução de trabalho | Instruções de trabalho e/ou cargo mal definidos | Insuficiência de treinamentos / instrução de trabalho | Você sente falta de treinamento para realizar bem o seu trabalho? |
| 4 | 2. Demandas de Trabalho | Demandas de Trabalho inadequadas | Dimensionamento/equipe insuficiente | Você sente falta de gente na sua equipe para dar conta do trabalho do dia a dia? |
| 5 | 2. Demandas de Trabalho | Demandas de Trabalho inadequadas | Metas acima da capacidade real | As metas que você precisa cumprir são difíceis de alcançar, mesmo se esforçando bastante? |
| 6 | 2. Demandas de Trabalho | Demandas de Trabalho inadequadas | Distribuição de demandas desigual entre cargos | Você sente que o trabalho é dividido de forma desigual entre você e seus colegas? |
| 7 | 2. Demandas de Trabalho | Demandas de Trabalho inadequadas | Excesso de demandas de trabalho (acima da possibilidade de horas para entrega dia/semana/mês) | A quantidade de trabalho que você recebe é maior do que dá para entregar no seu horário? |
| 8 | 2. Demandas de Trabalho | Demandas de Trabalho inadequadas | Trabalho monótono: repetitividade, estereotipia, padrão sonoro | Seu trabalho é repetitivo, com os mesmos movimentos ou tarefas o tempo todo? |
| 9 | 2. Demandas de Trabalho | Demandas de Trabalho inadequadas | Ausência de rotação/alternância de tarefas | Falta rodízio ou variedade de tarefas no seu dia a dia de trabalho? |
| 10 | 2. Demandas de Trabalho | Demandas de Trabalho inadequadas | Baixas demandas de trabalho / subutilização | Você fica parado(a), com pouco trabalho para fazer durante o expediente? |
| 11 | 3. Controle e Autonomia | Autonomia no trabalho | Baixa autonomia no trabalho | Falta oportunidade para você dar sua opinião ou sugestão sobre como o trabalho é feito? |
| 12 | 3. Controle e Autonomia | Autonomia no trabalho | Sequência de execução e/ou modo operatório imposto | A ordem e o jeito de fazer cada tarefa são impostos, sem oportunidade ou autonomia para você ajustar/definir a melhor forma? |
| 13 | 4. Ritmo e Cadência | Ritmo de Trabalho imposto e/ou intenso | Ritmo imposto por processo contínuo sem pausas | O ritmo do seu trabalho é imposto pela máquina ou linha de produção, sem parar para descansar? |
| 14 | 4. Ritmo e Cadência | Ritmo de Trabalho imposto e/ou intenso | Ritmo intenso sem pausas adequadas | O ritmo do seu trabalho é acelerado, com pausas insuficientes para descansar? |
| 15 | 4. Ritmo e Cadência | Ritmo de Trabalho imposto e/ou intenso | Prazos/metas inalcançáveis e/ou sem folga para pausa | Os prazos são tão apertados que fica difícil até parar para uma pausa? |
| 16 | 4. Ritmo e Cadência | Ritmo de Trabalho imposto e/ou intenso | Remuneração por produção | Você sente pressão para produzir mais rápido devido a acordo de remuneração por produção? |
| 17 | 4. Ritmo e Cadência | Ritmo de Trabalho imposto e/ou intenso | Trabalho sob pressão constante por prazos e entregas (urgência) | Você sente pressão no trabalho por prazos e entregas? |
| 18 | 5. Horários e Jornada | Jornada/Pausas/Regime de Trabalho Inadequados | Jornadas acima de 8/10/12h de forma frequente além do contratual/legal | Você trabalha mais horas do que o combinado no seu contrato? |
| 19 | 5. Horários e Jornada | Jornada/Pausas/Regime de Trabalho Inadequados | Horas extras frequentes, acima de 3x/semana, além do contratual/legal | Você faz hora extra mais de 3 vezes por semana? |
| 20 | 5. Horários e Jornada | Jornada/Pausas/Regime de Trabalho Inadequados | Imprevisibilidade de escala | Sua escala de trabalho muda de última hora sem avisos? |
| 21 | 5. Horários e Jornada | Jornada/Pausas/Regime de Trabalho Inadequados | Não concessão efetiva de pausas obrigatórias (NR-17) e/ou pausas livres | Você sente que falta pausas mínimas e obrigatórias durante o trabalho? |
| 22 | 6. Segurança no Emprego | Insegurança quanto à continuidade do vínculo empregatício | Vínculos precários por trabalho informal ou falta de comunicação | Você sente insegurança sobre seu vínculo/contrato de trabalho? |
| 23 | 6. Segurança no Emprego | Insegurança quanto à continuidade do vínculo empregatício | Ameaça de demissão como ferramenta de pressão | Alguém usa a ameaça de demissão para pressionar você a trabalhar mais ou de determinado jeito? |
| 24 | 6. Segurança no Emprego | Insegurança quanto à continuidade do vínculo empregatício | Instabilidade salarial | Seu salário varia ou atrasa de um jeito que te deixa inseguro(a)? |
| 25 | 7. Gestão de Mudanças | Gestão Inadequada nas mudanças Organizacionais | Ausência de processo de comunicação/alinhamento sobre mudanças | Mudanças na empresa acontecem sem que você seja avisado(a) ou preparado(a) para elas? |

### Bloco 2 — Fatores Sociais no Trabalho (17 perguntas)

| # | Dimensão | Fator de risco PGR | Causa investigada | Pergunta exibida ao colaborador |
|---|---|---|---|---|
| 26 | 8. Relações Interpessoais | Conflitos e Comunicação Deficiente entre a(s) equipe(s) | Conflitos interpessoais | Existem conflitos entre você, seu superior e/ou seus colegas de trabalho? |
| 27 | 8. Relações Interpessoais | Conflitos e Comunicação Deficiente entre a(s) equipe(s) | Falta de apoio entre colegas | Falta apoio dos colegas quando você precisa? |
| 28 | 9. Liderança | Gestão e/ou Liderança Inadequada | Autoritarismo | Sua liderança impõe decisões de forma autoritária, enérgica e/ou inflexível? |
| 29 | 9. Liderança | Gestão e/ou Liderança Inadequada | Injustiça nas decisões | Você sente que as decisões da liderança são injustas entre você ou seus colegas? |
| 30 | 9. Liderança | Gestão e/ou Liderança Inadequada | Monitoramento/vigilância digital além do exigido pela natureza regulatória | Você se sente vigiado(a) além do que seu trabalho realmente exige (câmeras, sistemas, etc.)? |
| 31 | 9. Liderança | Gestão e/ou Liderança Inadequada | Falta de reconhecimento | Você sente falta de reconhecimento sobre seu trabalho por parte da liderança? |
| 32 | 9. Liderança | Gestão e/ou Liderança Inadequada | Falta de feedback construtivo | Você sente falta de retorno sobre como está o seu desempenho? |
| 33 | 9. Liderança | Gestão e/ou Liderança Inadequada | Ausência de suporte para resolução de problemas | Você sente falta de apoio do seu superior quando surge um problema no trabalho? |
| 34 | 10. Equilíbrio Trabalho-Vida | Desequilíbrio Trabalho-Vida | Contato fora do horário além do previsto contratualmente | Você é procurado(a) para assuntos de trabalho fora do seu horário? |
| 35 | 11. Violência no Trabalho | Exposição a Violência e/ou assédio | Agressão verbal/física, ameaças ou violência de gênero por terceiros | Você já sofreu agressão verbal, física, ameaça ou violência de gênero por parte de clientes, fornecedores ou outras pessoas de fora da empresa? |
| 36 | 11. Violência no Trabalho | Exposição a Violência e/ou assédio | Assédio | Você já sofreu ou presenciou alguma situação de assédio de qualquer natureza internamente (entre superiores e colegas)? |
| 37 | 12. Tarefas com Exposição a Situações Extremas | Exposição a Situações Extremas Inerentes à Função | Contato habitual com pessoas em sofrimento (saúde, social, educação) | Se seu trabalho exige lidar com pessoas em sofrimento e você sente que falta suporte para você? |
| 38 | 12. Tarefas com Exposição a Situações Extremas | Exposição a Situações Extremas Inerentes à Função | Exposição a eventos traumáticos (morte, violência, acidentes graves) | Você presencia ou é exposto(a) a situações traumáticas no trabalho (morte, violência, acidente grave)? |
| 39 | 12. Tarefas com Exposição a Situações Extremas | Exposição a Situações Extremas Inerentes à Função | Trabalho em condições de risco físico contínuo | Seu trabalho te expõe a risco físico contínuo? |
| 40 | 12. Tarefas com Exposição a Situações Extremas | Exposição a Situações Extremas Inerentes à Função | Decisões com alto impacto em terceiros (saúde, segurança pública) | Você precisa tomar decisões que podem afetar seriamente a saúde ou segurança de outras pessoas, sem suporte suficiente? |
| 41 | 13. Trabalho Isolado ou Remoto | Trabalho isolado | Natureza do cargo exige isolamento físico (ex.: vigilância, trabalho remoto, trabalho separado e isolado) | Seu trabalho é fisicamente isolado(a) da equipe? |
| 42 | 13. Trabalho Isolado ou Remoto | Trabalho isolado | Ausência de rotina formal de contato com trabalhadores isolados/remotos | Mesmo trabalhando isolado(a) ou remoto, falta um contato regular organizado com a empresa/equipe? |

**Créditos do instrumento:** elaborado por Hozana Z. Ramirez (Ergonomista certificada ABERGO,
Fisioterapeuta do Trabalho CREFITO-3 70455) e Sugeil Rebeca Crespo (Administradora de empresas e
consultora de ergonomia).
