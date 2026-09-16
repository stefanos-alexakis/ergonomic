# Plan — Squad, Ferramentas, Banco de Dados e Infraestrutura

**Depende de:** [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md)

## 1. Squad

O usuário confirmou execução **solo + IA (Claude Code)**, escala **pequena/média**. A tabela
abaixo mostra os papéis necessários (metodologia, não headcount) e quem cobre cada um hoje.

| Papel | Responsabilidade | Quem cobre agora |
|---|---|---|
| Product Owner / especialista em ergonomia | Conteúdo do questionário, critérios de risco, validação do que sai no laudo | Usuário (é a especialidade dele) |
| Tech Lead / Full-stack | Toda a construção do app (Next.js + Prisma + Postgres) | Usuário + Claude Code |
| UI/UX | Fluxo do colaborador (mobile-first, jornada paginada, ~9 min), dashboards do gestor | Claude Code (skill `webdesign`) + validação do usuário |
| DevOps | Deploy Docker/Traefik na VPS, backups, monitoramento | Usuário + Claude Code, reaproveitando scripts já usados no CRM/OSManager |
| QA | Testes automatizados + roteiro manual da jornada anônima | Claude Code (Vitest + Playwright) + usuário |
| **DPO/Jurídico** (gate humano) | Revisão LGPD antes de coletar dados reais de colaboradores — dado psicossocial é sensível | **Único papel que não deve ser só-IA.** Recomendo revisão pontual de advogado/DPO antes do go-live com dados reais de qualquer cliente. |

**Squad "ideal" de referência**, caso o volume de clientes cresça a ponto de justificar
contratação: PO + 1 dev backend + 1 dev frontend + 1 UX + 1 QA + DevOps part-time + DPO
consultivo recorrente. Não recomendo montar isso agora — o modelo lean cobre a Fase 1
(ambiente de teste) e a primeira instalação em cliente confortavelmente.

## 2. Ferramentas (stack técnica)

Sem preferência declarada pelo usuário → recomendação por **consistência com o que já roda na
VPS agtrade** (ver `research.md` §1–2), reduzindo risco e reaproveitando conhecimento
operacional já validado.

| Camada | Escolha | Porquê |
|---|---|---|
| Framework full-stack | **Next.js 16 (App Router) + TypeScript** | Mesma versão do CRM Alex, a peça mais nova e madura da VPS |
| UI | **Tailwind CSS + componentes próprios em `src/components/ui/`** | Estilo "Swiss Modernism / Minimalismo" (via skill de UX): tipografia Inter, paleta cinza/preto (`zinc`), bordas finas de 1px em vez de sombra, sem decoração — pedido explícito do usuário para as telas de admin/gestor |
| ORM | **Prisma 7** (`@prisma/adapter-pg`) | Igual ao CRM Alex |
| Banco | **PostgreSQL 16** (container `postgres:16-alpine`) | Ver §3 |
| Auth (Admin/Gestor) | **NextAuth v5** | Igual ao CRM Alex; colaborador **não** usa isso (ver abaixo) |
| Sessão do colaborador | Mecanismo próprio: cookie httpOnly assinado, contendo só `codigoAcessoId` (opaco) — sem NextAuth, sem identidade | Anonimato é requisito de constituição, não pode passar por um sistema de contas |
| Cartões com QR | `qrcode` (npm) | Cartão físico do colaborador — URL + código, também como QR |
| Import/export de planilha | `exceljs` | Setores/departamentos/segmentos/funções por planilha (requisito explícito) |
| PDF (cartões e relatórios) | **`@react-pdf/renderer` para os dois casos** | Decisão revista na revisão (`review.md` §6.4): a alternativa (Playwright headless) exige Chromium dentro do container, que a imagem `node:alpine` não tem — funciona na máquina local e quebra na VPS. Gráficos entram no PDF como imagem gerada no próprio processo |
| Dashboards | **Recharts** | Já usado no CRM/OSManager |
| E-mail / cron | **Nodemailer + node-cron** | Igual ao CRM Alex — usado para alertar o Gestor e para o job de encerramento automático de pesquisa na `dataFim` |
| Testes | **Vitest** (unit) + **Playwright** (E2E da jornada anônima: código → páginas → revisar/concluir) | Igual ao CRM Alex + E2E é crítico pela natureza pública/anônima do fluxo |
| Containerização | **Docker Compose** (`app` + `db`) | Idêntico ao padrão CRM Alex/OS Manager |
| Reverse proxy / TLS | **Traefik** já existente na VPS agtrade, rede `traefik_traefik-public`, certresolver `letsencrypt` | Reaproveita infra existente, sem novo Nginx/Certbot a manter |

## 3. Banco de dados

**PostgreSQL único, multi-tenant por `workspaceId`** (não banco-por-cliente, não
schema-por-cliente) — mesma decisão validada em produção no CRM Alex. Motivos (detalhados em
`research.md` §1):
- Menor custo operacional (1 banco, 1 rotina de backup, 1 conjunto de migrations) para a escala
  pequena/média confirmada pelo usuário.
- Isolamento garantido por código (guard `resolveWorkspace()`-style obrigatório em toda rota
  business), padrão já testado.
- Fácil de auditar e de dar suporte (uma única fonte para consultar, com filtro de tenant
  explícito em cada query).

Catálogo do questionário (`Questionario`/`Bloco`/.../`Pergunta`) é a única parte do schema sem
`workspaceId` — é conteúdo da plataforma, não de uma empresa (`research.md` §4).

## 4. Infraestrutura e deploy

Arquitetura completa, convenção de nomes e ordem de instalação verificada: `review.md` §7.

### Fase 1 — Ambiente de teste (agtrade)
- Subdomínio `pesquisa.agtrade.com.br`, DNS tipo A apontando para a VPS agtrade.
- `docker-compose.yml` novo com `COMPOSE_PROJECT_NAME=pesquisa`: serviço `app` (`pesquisa-app`) +
  serviço `db` (`pesquisa-db`, `postgres:16-alpine`, **sem porta publicada**), rede interna
  `pesquisanet` + rede externa `traefik_traefik-public` (confirmar nome exato na VPS antes do
  primeiro deploy — `research.md` §2).
- Volumes nomeados: `pesquisa_pgdata` (banco) e `pesquisa_uploads` (logotipos das empresas — se os
  uploads ficarem dentro do container, somem a cada atualização; `review.md` §6.3).
- Labels Traefik no serviço `app`: router `pesquisa` com `Host(\`pesquisa.agtrade.com.br\`)`,
  entrypoint `websecure`, certresolver `letsencrypt`, porta interna 3000, rótulo
  `traefik.docker.network` presente, + router `pesquisa-http` com middleware
  **`pesquisa-https-redirect`** — nomes exclusivos, nunca reaproveitando os do CRM, senão o HTTPS
  não sobe e o erro não aparece (`review.md` §6.2).
- `.gitattributes` com `* text=auto eol=lf` desde o primeiro commit — desenvolvimento em Windows,
  execução em Linux (`review.md` §6.1).
- Access log do Traefik desligado (ou com IP anonimizado) para as rotas públicas da pesquisa, com
  retenção curta (`review.md` §1.5).
- Variáveis de ambiente próprias e novas (nunca reaproveitar segredo de outro app):
  `POSTGRES_USER/PASSWORD/DB`, `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL=https://pesquisa.agtrade.com.br`,
  `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`.
- `prisma db push` para o primeiro schema (banco novo, sem migrations ainda) — depois de
  estabilizado, migrar para `prisma migrate deploy` com `entrypoint.sh`, igual ao CRM Alex.
- Backup diário via cron do banco **e do volume de uploads**, com rotação e **teste de restauração
  antes do go-live** (`review.md` §6.7).
- Rotina diária que marca pesquisas vencidas como `ENCERRADA` — espelho para relatório; a decisão
  de bloquear acesso é sempre tomada comparando com a hora atual (`review.md` §2.2).

### Fase 2 — VPS do cliente
- Empacotar um `PLANO-INSTALACAO-PESQUISA.md` autocontido (mesmo modelo do pacote em
  `Inatalar-Nova_VPS`): sem segredos reais, todo valor sensível como `<PLACEHOLDER>`, gates
  humanos explícitos (VPS provisionada, DNS, SMTP do cliente, primeiro admin).
- Mesma arquitetura (`app`+`db`+Traefik) replicada 1:1, gerando segredos novos do zero.

### Fase 2 (futura, fora desta especificação) — Agente de IA de gestão
Documentado em `research.md` §3. Quando for pedido: registrar a app no OSManager/AlexClaw dessa
VPS via `POST /api/agente/registrar`, adicionar `AgenteIA`+`AgentWorkspace` (aditivo) e expor um
endpoint próprio de agente, espelhando o padrão do CRM Alex. Não implementar agora.

## 5. Riscos e mitigação

Lista completa de bugs prováveis (anonimato, concorrência, jornada paginada, multi-tenant,
estatística e deploy) em [review.md](review.md). Resumo dos estruturais:

| Risco | Mitigação |
|---|---|
| Dado psicossocial é sensível sob a LGPD mesmo sendo anônimo (pode ser sensível por natureza, não por identificabilidade) | Revisão de DPO/jurídico antes do go-live com dados reais (§1); constituição §1 e §3 como guard-rails técnicos |
| Reidentificação por cruzamento de filtros (setor pequeno + função rara) | Regra de supressão de grupo pequeno (constituição §3, `Pesquisa.limiteSupressaoGrupo`) aplicada sempre na camada de agregação |
| Rede/certresolver Traefik da VPS agtrade diferir do assumido | Confirmar na Fase 1 antes do primeiro deploy; só afeta labels, não arquitetura |
| Import de planilha com dados mal formatados | Validação e relatório de erros linha-a-linha na importação (Fase 3 das tasks), nunca falha silenciosa |
