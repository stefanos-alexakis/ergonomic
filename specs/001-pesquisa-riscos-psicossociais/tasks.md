# Tasks — Roadmap de execução

Fases de trabalho, não estimativa de horas. Cada fase deve terminar em um estado demonstrável.
As tarefas marcadas com 🔒 vêm da revisão de riscos ([review.md](review.md)) — são as que costumam
ser esquecidas por serem invisíveis quando tudo "parece funcionar".

## Fase 0 — Setup do projeto ✅ concluída e verificada
- `create-next-app` (App Router, TypeScript, Tailwind) + shadcn/ui. *(shadcn/ui ainda não
  instalado — entra quando a primeira tela precisar de componente)*
- 🔒 `.gitattributes` com `* text=auto eol=lf` **no primeiro commit** (Windows → Linux). Feito.
- Prisma + Postgres local via Docker Compose (dev). Feito (`docker-compose.dev.yml`).
- Estrutura de pastas por domínio — a estrutura por domínio (empresa/pesquisa/licença/...) começa
  na Fase 2; por ora só `src/lib` (utilitários) existe.
- Vitest configurado e com 9 testes passando. Playwright configurado, sem specs ainda (só entram
  na Fase 5, quando a jornada existir).
- `npm run build`, `npx tsc --noEmit` e `npx vitest run` rodando limpos.

## Fase 1 — Modelo de dados + seed do questionário ✅ concluída e verificada
- Schema Prisma completo em `prisma/schema.prisma` (`data-model.md`).
- Script de seed (`prisma/seed.ts`) lê `prisma/seed-data/perguntas.json` — gerado do
  `perguntas-pesquisa.xlsx` resolvendo os intervalos de mesclagem reais das colunas A/B/C, não por
  "carregar o último valor visto" (achado durante a extração: o fator de risco de duas dimensões
  estava desalinhado da primeira linha — ver `review.md`). Assertivas de 42 / 25+17 no próprio
  script.
- **Testado contra PostgreSQL 16 real** (Docker): `db push` → seed → 2 blocos, 13 dimensões,
  13 fatores, 42 perguntas no banco. Seed roda duas vezes sem duplicar. Servidor Next.js sobe e
  responde: `/` → 200, `/api/health` → `{"status":"ok"}`.
- Gotcha do Prisma 7 (adaptador obrigatório em todo `PrismaClient`, inclusive em scripts avulsos)
  documentado em `review.md` §6.8b.

## Fase 2 — Administrador da plataforma 🟡 em andamento
- ✅ Login (NextAuth v5, Credentials) e proxy (`src/proxy.ts`) protegendo `/admin` e `/gestor` —
  redireciona para `/login` sem sessão, e para `/` se autenticado mas não for
  `isPlatformAdmin`.
- ✅ Bootstrap do primeiro admin: `npm run admin:create` (`scripts/create-admin.ts`).
- ✅ Criar empresa + Gestor (`/admin/empresas/nova`): nome, logo (upload validado por assinatura
  binária real — nunca pela extensão, `review.md` §4.2), cores opcionais (checkbox explícito —
  sem marcar, fica `null` e a pesquisa usa o tema cinza padrão), cria `User`+`Membership`
  `GESTOR` numa transação (`src/lib/workspace.ts`).
- ✅ Lista de empresas em `/admin`.
- ✅ **Testado de ponta a ponta com Playwright** contra PostgreSQL real: login → criar empresa
  com gestor → aparece na lista. 2/2 specs passando.
- ✅ Editar empresa (`/admin/empresas/[id]/editar`): nome, logo (substituir, mantém o atual se
  vazio), cores, dados do gestor (nome/e-mail, nunca senha por aqui) e o botão "Empresa ativa".
  Nunca permite editar o `slug` — já pode estar impresso em cartão/QR distribuído.
  🔒 Desativar bloqueia de verdade: `getWorkspaceDoGestor` (usado por toda a área do gestor) e
  `resolvePesquisaPublica` (jornada do colaborador) já filtravam `isActive`; achado ao testar —
  faltava aplicar o mesmo filtro no ponto de entrada do gestor, corrigido antes de declarar
  pronto. Testado de ponta a ponta: edita, inativa, confirma que o gestor logado cai em "sem
  empresa vinculada".
- ⬜ Tela de acompanhamento com status de pesquisas ativas (a lista de empresas ainda só mostra
  nome/slug/contagem — não é o mesmo pedido que "editar empresa", fica para quando for pedido).

## Fase 3 — Gestor: pesquisas e estrutura organizacional ✅ concluída e verificada
- ✅ Criação de `Pesquisa` (`/gestor/pesquisas/nova`): nome, licenças, datas, vinculada ao
  questionário ativo. Validação (data fim > início, licenças inteiro positivo) em
  `src/lib/pesquisa.ts`, com 3 testes unitários.
- ✅ Cadastro manual de `SetorOrg`/`Departamento`/`Segmento`/`Funcao` (`/gestor/estrutura`).
- ✅ Importação por planilha (.xlsx, `exceljs`): lê 4 colunas por cabeçalho (não por posição),
  remove duplicados, reporta erro por linha/coluna sem interromper a importação das linhas boas
  (`src/lib/planilha-estrutura.ts`, 4 testes unitários com planilha real gerada em memória).
- **Decisão tomada** (estava pendente): o catálogo organizacional pertence ao *workspace*, não a
  uma pesquisa específica — toda pesquisa da empresa vê o mesmo catálogo. Mais simples, sem
  requisito que pedisse o contrário; se um cliente precisar restringir setores por pesquisa,
  entra como tabela de junção depois (aditivo).
- **Testado de ponta a ponta com Playwright**: login do gestor certo → cria pesquisa → aparece
  com status `RASCUNHO` → importa planilha de teste → itens aparecem → cadastro manual também
  funciona. 3/3 specs E2E passando (mais os 2 da Fase 2).
- 🐛 Dois bugs reais de login só apareceram nesse teste de navegador (não em unitário) — ver
  `review.md` §8b: destino pós-login fixo em `/admin` para todo mundo, e uma corrida entre
  `signIn()` e `auth()` na mesma execução. Os dois corrigidos.

## Fase 4 — Licenças e códigos de acesso ✅ concluída e verificada
- ✅ Geração em lote: N `PARTICIPANTE` + ceil(N×5%) `TESTE`, código opaco único
  (`src/lib/licenca.ts`). Guard contra gerar duas vezes para a mesma pesquisa.
- ✅ 🔒 Alfabeto sem caracteres ambíguos e normalização da digitação — já vinha da Fase 0
  (`src/lib/codigo.ts`), reaproveitado aqui.
- ✅ 🔒 `createMany` com `skipDuplicates` + confere a contagem inserida e completa o que faltou,
  em rodadas, até bater a quantidade pedida (nunca menos, em silêncio).
- ✅ Pesquisa ganhou campo `slug` (único por workspace) — é o que vai fixo na URL impressa no
  cartão; adicionado depois do desenho inicial, decisão registrada em `data-model.md`.
- ✅ Listagem de códigos com tipo/status na página da pesquisa (`/gestor/pesquisas/[id]`).
- ✅ Export de cartões em PDF (`@react-pdf/renderer`) com QR (`qrcode`) apontando para
  `<NEXT_PUBLIC_APP_URL>/p/<workspaceSlug>/<pesquisaSlug>?codigo=<codigo>`.
- 🐛 **A versão inicial de `@react-pdf/renderer` (4.1.6) não funcionava neste ambiente** —
  quebrava ao desenhar qualquer texto, só descoberto ao gerar um PDF de verdade (não pelo build).
  Corrigido atualizando para 4.9.0. Ver `review.md` §6.9.
- **Testado de ponta a ponta com Playwright**: gera 20 licenças + 1 teste, lista mostra os 21
  códigos com tipo/status corretos, baixa o PDF e confere a assinatura `%PDF-` e tamanho real do
  arquivo (não um placeholder). 4/4 specs E2E passando (soma de todas as fases).

## Fase 5 — Jornada do colaborador (a mais sensível) ✅ concluída e verificada
- ✅ Tela de entrada: informar código (`FormularioCodigo`) → `iniciarComCodigo` valida
  status/vigência antes de qualquer coisa.
- ✅ 🔒 Acesso via QR (`?codigo=`) tratado no `src/proxy.ts`: grava cookie de curta duração e
  redireciona para a URL limpa **antes** de qualquer página renderizar — o código nunca fica
  visível na barra de endereço.
- ✅ Seleção organizacional: setor/departamento obrigatórios (`<select>`); segmento/função
  opcionais, com checkbox explícito "prefiro não informar" que remove o campo do envio.
- ✅ 🔒 `salvarOrganizacao` confirma que setor/departamento/segmento/função pertencem ao
  workspace da pesquisa antes de gravar (`src/lib/resposta.ts`).
- ✅ Questionário **paginado** por bloco (`montarPaginas`, 7 perguntas/página, nunca mistura
  Bloco 1 e 2 — 7 páginas para as 42 perguntas reais), com "Voltar" e "Próximo".
- ✅ 🔒 Todas as perguntas da página são obrigatórias (`required` nos rádios + validação
  server-side em `salvarPagina`).
- ✅ Tela de revisão (`Revisao`) com a pergunta exata da spec — "Você gostaria de revisar suas
  respostas ou quer concluir a pesquisa?" — seções recolhidas por bloco, link "editar" por
  pergunta levando direto à página certa.
- ✅ Guard de vigência por hora atual (`pesquisaAceitaAcesso`, não o campo de status): novo
  acesso bloqueado no encerramento; quem já começou tem 60 min de tolerância.
- ✅ 🔒 Concluir é idempotente (`concluirResposta` verifica `concluidoEm` antes de agir).
- ✅ Colaborador nunca vê dimensão/fator de risco/situação investigada — só a pergunta e as 5
  opções, em nenhuma tela (nem na revisão).
- 🐛 **Bug mais sutil do projeto até agora**: o primeiro clique em "Próximo" de cada página era
  silenciosamente ignorado (`.bind()` recriando a função a cada render confundia o
  `useActionState`). Só apareceu no teste de navegador; nenhum unitário chegaria perto. Corrigido
  com `useMemo`. Ver `review.md` §3b.
- **Testado de ponta a ponta com Playwright**: código via QR → URL limpa → auto-envio → seleção
  de organização com campos opcionais recusados → as 7 páginas reais do questionário → revisão
  com seções recolhidas → concluir → agradecimento → reload idempotente → **novo navegador com o
  mesmo código reconhece "já concluído"** sem reabrir o formulário. 5/5 specs E2E de todas as
  fases passando juntas.

## Fase 6 — Dashboards e relatórios do Gestor ✅ concluída e verificada
- ✅ Uma única função de agregação (`calcularDashboard`, `src/lib/dashboard.ts`), já filtrando
  `tipo = PARTICIPANTE` + `concluidoEm != null` + normalizando por `Pergunta.polaridade` — todo
  painel e o relatório em PDF consomem essa mesma função, nunca duas versões da verdade.
- ✅ 🔒 Supressão de grupos abaixo de `Pesquisa.limiteSupressaoGrupo` **e** do segundo menor
  quando só um for suprimido (reaproveita `aplicarSupressaoGruposPequenos` da Fase 0, já testada).
- ✅ Nenhuma tela ou export expõe horário individual de resposta (o cálculo nem carrega
  timestamps por pessoa).
- ✅ Estados vazios desenhados: pesquisa sem respostas concluídas suficientes mostra aviso, não
  `NaN`/tela quebrada.
- ✅ Painel separa três números: códigos distribuídos · iniciadas · concluídas
  (`/gestor/pesquisas/[id]/dashboard`).
- ✅ Relatório em PDF (`@react-pdf/renderer`, mesma biblioteca corrigida na Fase 4) com os mesmos
  números e a mesma supressão do painel — nunca dados diferentes entre tela e PDF.
- **Testado de ponta a ponta com Playwright**: estado "insuficiente" antes de qualquer resposta →
  semeados 3 grupos direto no banco (10, 6 e 1 pessoas — a jornada do colaborador em si já foi
  exaustivamente testada na Fase 5, então aqui o alvo é o painel) → confirma contagem exata
  (37 distribuídos, 17 iniciadas, 17 concluídas, média 3.00) → confirma que o grupo de 10 fica
  visível, e que **tanto o de 1 quanto o de 6** ficam marcados como "dados insuficientes" — a
  regra anti-subtração suprimindo um grupo que isoladamente teria N suficiente, exatamente como
  desenhado no `review.md` §1.1. Download do relatório PDF confirmado como arquivo real.
  6/6 specs E2E de todas as fases passando juntas.

## Fase 7 — Deploy no ambiente de teste (pesquisa.agtrade.com.br)
Arquitetura e ordem verificada: `review.md` §7 e §10.
- ✅ `docker-compose.yml` de produção com nomes exclusivos (`pesquisa-app`, `pesquisa-db`,
  `pesquisanet`, `pesquisa_pgdata`, `pesquisa_uploads`, middleware `pesquisa-https-redirect`),
  banco sem porta publicada.
- ✅ Imagem Docker construída e testada de ponta a ponta localmente (build, `db push` automático
  no boot, `db seed`, `admin:create`, login real) — 9 bugs reais encontrados e corrigidos só
  rodando a imagem de verdade (review.md §10). `.dockerignore` criado.
- ✅ Código publicado em <https://github.com/stefanos-alexakis/ergonomic> (primeiro commit).
- ✅ Rede/certresolver Traefik confirmados na VPS real (`traefik_traefik-public`, `letsencrypt`,
  entrypoints `web`/`websecure` — idênticos ao que já estava no `docker-compose.yml`, conferido
  contra as labels do `crm-alex-app-1`). DNS já resolvia via Cloudflare.
- ✅ `.env` de produção gerado na própria VPS pelo usuário, com segredos próprios (nunca
  reaproveitados de outro app).
- ✅ `docker compose up -d --build`, `db seed` (42 perguntas), primeiro `PLATFORM_ADMIN` criado —
  tudo rodado na VPS pelo usuário, comando a comando, guiado nesta sessão.
- ✅ **Deploy verificado em produção**: `https://pesquisa.agtrade.com.br` responde 200, HTTPS
  válido (Let's Encrypt atrás de Cloudflare), login de administrador testado de verdade pelo
  navegador.
- ✅ Bug real encontrado só no clone limpo da VPS (não aparecia no ambiente local, que já tinha a
  pasta em disco): `public/` estava vazia e o Git não versiona diretórios vazios — o Dockerfile
  quebrava com "COPY .../public: not found". Corrigido com `public/.gitkeep`, revalidado com
  clone+build do zero antes de pedir pro usuário tentar de novo (review.md §10).
- ⬜ 🔒 Access log do Traefik desligado/anonimizado nas rotas públicas da pesquisa — configuração
  do Traefik em si, fora do repositório desta app; ainda não confirmado (constitution.md —
  anonimato do colaborador). **Único item pendente antes de considerar a Fase 1 100% fechada.**
- Verificar: acesso público funcional em `https://pesquisa.agtrade.com.br`, HTTPS válido.

## Fase 8 — Hardening e aceite
- Rodar os critérios de aceite do `spec.md` §8 (R1–R10 + R6b) como checklist manual + o que já
  estiver automatizado em Playwright/Vitest.
- 🔒 Teste automatizado de isolamento: trocar o ID do workspace na URL autenticado como Gestor da
  empresa A e exigir "não encontrado".
- 🔒 Upload de logo: aceitar só PNG/JPG/WebP, validar conteúdo real (não a extensão), recusar SVG.
- 🔒 Cores da marca: validar formato hexadecimal e checar contraste mínimo automaticamente.
- 🔒 Teste de fuso horário: pesquisa marcada para 18:00 encerra às 18:00 locais.
- Revisão de LGPD/DPO (gate humano, `plan.md` §1) antes de qualquer dado real de colaborador.
- Backup do banco **e do volume de uploads** validado com uma restauração de teste completa.

## Fase 9 — Empacotar para a VPS do cliente
- Escrever `PLANO-INSTALACAO-PESQUISA.md` autocontido (sem segredos reais), no mesmo formato do
  pacote em `Inatalar-Nova_VPS`.
- Rodar a instalação uma vez do zero seguindo só esse documento, para validar que está completo.

## Fase 10 (futura, fora desta especificação) — Agente de IA de gestão
Ver `research.md` §3 e `plan.md` §4. Só entra no roadmap quando for explicitamente pedido.
