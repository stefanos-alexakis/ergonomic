# Research — Decisões técnicas e alternativas descartadas

## 1. Reaproveitar o padrão da VPS agtrade em vez de começar do zero

A VPS `agtrade.com.br` já roda, em produção, uma stack construída pelo mesmo desenvolvedor:
`OSManager` (Next.js 14) e `CRM Alex` (Next.js 16), ambos Prisma + PostgreSQL + Docker Compose +
Traefik. Investigação feita em `C:\Users\Stefanos\.claude\projects\Inatalar-Nova_VPS\` (pacote de
instalação dessa stack para novos clientes).

**Achado central**: as duas apps *parecem* iguais mas resolvem multi-tenancy de forma diferente:

| | OS Manager | CRM Alex |
|---|---|---|
| Next.js | 14 | 16 |
| Prisma | mais antigo | 7 (`@prisma/adapter-pg`) |
| Multi-tenant | **Não** — schema flat, isolamento só por `Role` (ADMIN/MANAGER/COLLABORATOR/CLIENT) | **Sim** — `Workspace` como tenant root, `workspaceId` em toda tabela de negócio, `Membership` (User↔Workspace, role), guard obrigatório `resolveWorkspace()` |
| Agentes de IA | Sim, mas com acesso "MANAGER" a todo o dataset (sem escopo por cliente) | Sim, escopado por `AgentWorkspace` |

**Decisão**: copiar o padrão de dados e deploy do **CRM Alex**, não do OS Manager. É a única das
duas peças que já resolveu exatamente o problema que esta plataforma tem — isolar múltiplas
empresas no mesmo banco com segurança.

**Alternativas descartadas:**
- *Banco por tenant (1 Postgres database por empresa cliente)* — mais isolamento físico, mas
  contraria o padrão já operado (CRM Alex usa 1 banco), multiplica custo de manutenção
  (migrations em N bancos) e backup, sem ganho real dado que o guard de aplicação já é a barreira
  testada em produção. Descartado para a escala esperada (pequena/média).
- *Schema-por-tenant (Postgres schemas)* — meio-termo que nenhuma das apps existentes usa;
  adicionaria uma camada de complexidade (roteamento de schema por request) sem precedente local
  para copiar. Descartado.
- *Firebase/Supabase (BaaS)* — sairia do padrão de infraestrutura já pago e operado (VPS própria,
  Traefik, backups próprios) e criaria uma dependência de nuvem de terceiro nova, sem necessidade
  — a escala do projeto não justifica. Descartado.
- *PHP/Laravel* — stack comum em VPS com painel (Plesk/cPanel), mas o usuário não tem
  preferência e a VPS já não usa PHP para nada; adotar Next.js mantém um único conjunto de
  conhecimento operacional (deploy, logs, backups, Traefik labels) para todas as apps na mesma
  VPS. Descartado.

## 2. Reaproveitar convenções de deploy (Docker Compose + Traefik)

Confirmado nos `DEPLOY.md` de `03-OSManager` e `04-CRM`: ambos usam o mesmo formato de
`docker-compose.yml` (`app` + `db:postgres:16-alpine`), a mesma rede externa
`traefik_traefik-public`, os mesmos labels de roteamento Traefik (certresolver `letsencrypt`,
`entrypoints: websecure`/`web` + middleware de redirect HTTP→HTTPS, porta interna 3000), e os
mesmos nomes de variável de ambiente (`AUTH_SECRET`, `AUTH_URL`, `AGENT_API_KEY`, `CRON_SECRET`,
`POSTGRES_USER/PASSWORD/DB`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`).

**Decisão**: usar exatamente esse formato para a nova app (serviço `app` + `db`, mesma rede
`traefik_traefik-public`, mesmo esquema de labels), assumindo que a instância de Traefik dessa
VPS já está no ar (mesma infra do OS Manager/CRM). **Assunção a confirmar na Fase 7
(deploy):** existência e nome exato da rede Traefik e do certresolver configurado na VPS agtrade
— se diferir, ajustar só os labels, sem mudar a arquitetura.

## 3. Integração futura com agente de IA de gestão (Fase 2 — não construída agora)

O usuário confirmou que, numa segunda etapa, a ferramenta precisa de gestão por um agente de IA,
no mesmo padrão do "Bot Chess"/Salomão que já opera o CRM. Investigação do framework **AlexClaw**
(`01-AlexClaw/docs/ARQUITETURA.md`, `COMO-FUNCIONA.md`) e do template de plugin de agente
(`02-Agente-Salomao/agencia-chess-plugin-TEMPLATE`):

- Um agente é um Claude Code rodando 24/7 num container Docker, conversando por Telegram
  (`claude --channels plugin:telegram@claude-plugins-official`), com identidade compilada a
  partir de `SOUL`+`PERSONALITY`+`IDENTITY`+`working-memory` num `AGENT.md`.
- O agente **nunca fala direto com o banco da nova app** — ele se registra via
  `POST /api/agente/registrar` (autenticado com uma chave global `AGENT_API_KEY`), recebe uma
  chave própria (`slug_<hex>`, hash SHA-256 guardado, valor puro mostrado uma única vez), e a
  partir daí autentica cada chamada com `Authorization: Bearer <chave>`.
- No CRM Alex, o agente fica escopado por `AgentWorkspace` (mesma tabela de vínculo que um
  humano usa via `Membership`, só que para agentes) — ou seja, um agente só vê os workspaces aos
  quais foi explicitamente ligado, a menos que marcado como `isPlatformAgent` (só um admin humano
  pode conceder isso).
- Um timer systemd (`<slug>-pickup.timer`, a cada 5 min) chama `pickup-work.py` dentro do
  container: heartbeat (`/api/agente/ping`), busca trabalho atribuído
  (`/api/agente/tarefas-atribuidas`), e dispara uma sessão headless do Claude para executar.

**Decisão**: **não implementar nada disso agora.** O único cuidado nesta fase é não desenhar o
schema de um jeito que *impeça* adicionar depois `AgenteIA` + `AgentWorkspace` (aditivo, sem
migração destrutiva) e um endpoint `/api/agente/registrar` espelhando o do CRM Alex. Ver
`constitution.md` §7.

## 4. Modelo de dados do questionário: catálogo global vs. por empresa

O texto do usuário diz "as perguntas já estarão previamente disponíveis na plataforma ou poderão
ser vinculadas a um questionário cadastrado" — ou seja, o questionário (42 perguntas, 2 blocos,
13 dimensões) é conteúdo **da plataforma**, não de uma empresa específica.

**Decisão**: `Questionario`/`Bloco`/`Dimensao`/`FatorRisco`/`Pergunta` são um catálogo global
(sem `workspaceId`), seedado uma vez a partir de `perguntas-pesquisa.xlsx` (fonte oficial) e
versionável (campo `versao` em `Questionario`) para o dia em que a ergonomista atualizar o
instrumento. Uma `Pesquisa` de uma empresa apenas **referencia** um `Questionario` — nunca copia
as perguntas para dentro do workspace.

**Alternativa descartada**: clonar as perguntas por empresa a cada pesquisa criada. Descartado
porque complicaria correções/atualizações do instrumento (teria que propagar manualmente) sem
nenhum requisito que peça personalização de pergunta por empresa.

## 5. Escala de resposta: enum fixo vs. tabela configurável

As 42 perguntas usam a mesma escala 1–5 (Não/Nunca → Sempre), sem exceção, em ambas as fontes
(`.docx` e `.xlsx`).

**Decisão**: modelar como `Int` (1–5) com os rótulos fixos em código/constante de UI, não como
tabela `OpcaoResposta` configurável — não há requisito de escala variável por pergunta ou por
pesquisa, e uma tabela configurável seria complexidade sem uso real (evitar over-engineering).
