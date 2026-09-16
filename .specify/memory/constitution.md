# Constituição do Projeto — Plataforma de Pesquisa de Riscos Psicossociais

> Princípios inegociáveis. Qualquer decisão de spec, plano ou task que conflite com um item
> abaixo deve ser rejeitada ou o item deve ser emendado aqui explicitamente, nunca contornado
> silenciosamente no código.

## 1. Anonimato absoluto do colaborador respondente

- Nenhuma tabela do sistema pode conter nome, e-mail, matrícula, CPF, telefone ou qualquer
  identificador pessoal do colaborador respondente. Isso vale para o schema, para logs de
  aplicação e para qualquer export.
- Nenhum log de aplicação (requisições, erros, auditoria) pode amarrar um IP ou user-agent
  completo a uma resposta específica de pesquisa. Logs de infraestrutura (proxy/servidor) seguem
  política de retenção curta e não são usados para reidentificação.
- O código de acesso é o único identificador do respondente, é opaco (não sequencial, não
  derivável) e de uso controlado (ver §4).
- Gestores e administradores da plataforma **nunca** têm uma tela ou endpoint que mostre uma
  resposta individual vinculável a uma pessoa — apenas dados agregados (ver §3).

## 2. Isolamento multi-tenant real

- Toda query de negócio (empresa, pesquisa, licença, resposta, dashboard) passa por um
  `workspaceId` resolvido a partir de quem está autenticado — nunca aceito como parâmetro de
  confiança vindo do cliente sem verificação de vínculo (`Membership`).
- Um Gestor só acessa o workspace da própria empresa. Um Administrador da plataforma acessa
  todos, mas essa é uma permissão explícita (`PLATFORM_ADMIN`), não um bypass acidental.
- Nenhuma exceção "temporária" a essa regra é aceitável, nem em código de seed/debug que possa
  chegar a produção.

## 3. Estatística nunca compromete o anonimato

- Nenhum agregado (setor × departamento × segmento × função, cruzado ou não) pode ser exibido
  isoladamente quando representa menos de N respostas concluídas (padrão N=5, configurável por
  workspace). Grupos abaixo do limite são suprimidos ou agrupados em "outros".
- A supressão precisa resistir à dedução por subtração: se apenas um grupo for suprimido, o
  segundo menor também é — senão o total visível revela o valor escondido.
- Horário individual de resposta nunca é exibido ou exportado, nem em listagens ordenáveis —
  timestamp preciso permite cruzamento com ponto eletrônico e reidentificação.
- Códigos do tipo `TESTE` nunca entram em contagem, indicador, dashboard ou relatório oficial —
  são filtrados na camada de agregação, não apenas na UI.
- Respostas em rascunho (não concluídas) não entram em estatística oficial.

## 4. Códigos de acesso são únicos, opacos e de uso controlado

- Cada código pertence a exatamente uma pesquisa, tem um tipo (`PARTICIPANTE` ou `TESTE`) e um
  status (`DISPONIVEL`, `INICIADO`, `CONCLUIDO`, `EXPIRADO`, `BLOQUEADO`).
- Um código concluído não pode ser reaberto para nova resposta. Um código pode ser retomado
  (rascunho) enquanto a pesquisa estiver dentro do período de vigência.
- Ao encerrar a pesquisa (data/hora de fim), nenhum código consegue iniciar ou continuar
  respondendo — a aplicação bloqueia no backend, não só escondendo o link no frontend.

## 5. Acessibilidade e mobile-first

- A jornada do colaborador é a que mais importa nesse critério: precisa funcionar bem em
  celular, com contraste e tamanho de toque adequados, e sem exigir instalação de app.
- Personalização visual por empresa não pode reduzir a acessibilidade (contraste mínimo é
  verificado mesmo quando a empresa fornece cores próprias).

## 6. Consistência com a infraestrutura já operada

- A stack (Next.js + Prisma + PostgreSQL + Docker Compose + Traefik) segue o padrão já validado
  em produção na mesma VPS (CRM Alex). Desviar desse padrão exige justificativa técnica
  registrada em `research.md`, não só preferência pessoal.
- Segredos são gerados do zero por instalação (VPS de teste e, depois, VPS de cada cliente) —
  nunca reaproveitados entre ambientes.

## 7. Extensibilidade sem construção prematura

- O desenho de dados não pode *impedir* a futura integração de um agente de IA de gestão
  (padrão AlexClaw/OSManager já em uso: `AgenteIA` + escopo por workspace), mas essa integração
  não é construída nesta fase. Documentar o caminho é suficiente; implementar antes de ser
  pedido é desperdício.
