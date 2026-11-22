# Handoff — Plataforma FRPRT (Pesquisa Psicossocial)

> Escrito em 22/11/2026 para continuar o trabalho numa sessão nova. Leia inteiro antes de mexer em
> qualquer coisa. Complementa a memória do projeto (`~/.claude/projects/D--2026-v2-Ergonomic-Pesquisa/memory/`)
> e o guia de deploy (`C:\Users\Stefanos\.claude\docs\deploy-vps.md`).

---

## 1. Estado atual (22/11/2026)

| Onde | Estado |
|---|---|
| Git local (`D:\2026-v2\Ergonomic\Pesquisa`) | `main` = `origin/main` = `15ff797`. Nenhum branch com trabalho pendente. |
| GitHub | `stefanos-alexakis/ergonomic`, branch `main`. |
| Produção | https://pesquisa.agtrade.com.br — VPS `root@2.24.75.225`, app em `/opt/pesquisa-psicossocial`, rodando `5a58f72` (o `15ff797` só acrescentou documentos). |
| Backup mais recente | `/opt/pesquisa-psicossocial/backups/pesquisa-2026-10-09-1600.sql` (antes do último deploy). |

Fora do git de propósito:
- `scripts/seed-empresa-homologacao.ts` — cria a empresa de teste local; a linha 1 tem o login de teste.
- `test-results/` (o Playwright apaga a pasta a cada execução — não guarde nada lá) e `.claude/`.
- `Modificacoes/` — **novas solicitações do cliente (19/11/2026), ainda não analisadas**:
  - `Solicitacao_Melhorias_Sistema_Avaliacao_Psicossocial.docx`
  - `Relatório sistema Fatores de Risco Psicossocial.docx` (2,5 MB, provavelmente com imagens/modelo de relatório)

---

## 2. Stack e como rodar

- Next.js 16 (App Router, Turbopack, `output: "standalone"`), React 19, Prisma 7 + PostgreSQL, Auth.js
  (next-auth 5 beta), Tailwind, `@react-pdf/renderer` 4.9 para PDFs, `exceljs` para planilhas, Vitest + Playwright.
- **Leia `AGENTS.md`**: esta versão do Next tem mudanças; consulte `node_modules/next/dist/docs/` antes de usar APIs novas.
- Dev server: `.claude/launch.json` → `pesquisa-dev` (porta 3000). Use as ferramentas de preview, não `npm run dev` no Bash.
- Banco local: `DATABASE_URL` em `.env.local`. Para comandos Prisma/tsx no Bash:
  `export $(grep -E "^DATABASE_URL=" .env.local | sed 's/"//g')`.
- Schema: `npx prisma db push` **e depois** `npx prisma generate` (o Prisma 7 não gera sozinho), e **reinicie o dev server**
  (senão o Prisma Client antigo continua carregado — erro "Cannot read properties of undefined (reading 'findMany')").
- Testes: `npx tsc --noEmit` · `npx vitest run` (223 testes) · `npx playwright test --workers=1` (22 testes, ~7 min).
- Login local: admin de teste = padrões em `e2e/*.spec.ts` (`E2E_ADMIN_EMAIL`/`E2E_ADMIN_SENHA`); gestor da empresa
  de teste = linha 1 de `scripts/seed-empresa-homologacao.ts`. **Não repita credenciais no chat** — aponte o arquivo.

### Dados de teste locais
- **Metalúrgica Horizonte (teste)**: 4 setores; pesquisa "Diagnóstico Psicossocial 2026" (40 respostas); Eixo 2
  preenchido pelo Stefanos ("Pesquisa Teste out2026"); Eixo 3 publicado. Existe também a pesquisa "Teste Rebeca"
  (mais recente, sem respostas) — o Painel FRPRT abre nela por padrão; escolha a "Diagnóstico" no seletor.
- O banco local tem **centenas de empresas de E2E** → `/admin` fica lento em dev (por isso alguns testes têm timeout maior).

---

## 3. Mapa do código (onde mora cada regra)

| Assunto | Arquivos |
|---|---|
| Score / faixas / conclusões | `src/lib/score-final.ts` (`concluir`, `CONCLUSOES`, cortes 3,00/4,00 em centésimos) |
| Eixo 1 (painel da pesquisa) | `src/lib/dashboard.ts`, `src/app/gestor/pesquisas/[id]/dashboard/` |
| Distribuição pergunta a pergunta | `src/lib/distribuicao-respostas.ts`, `src/lib/distribuicao-excel.ts`, `.../dashboard/distribuicao/` |
| Anonimato (supressão) | `src/lib/agregacao.ts` (mínimo + segundo menor grupo); `Pesquisa.limiteSupressaoGrupo` (= 3) |
| Jornada do colaborador | `src/app/p/[workspaceSlug]/[pesquisaSlug]/`, `src/lib/resposta.ts` |
| Pré-pesquisa | `src/lib/pre-pesquisa.ts`, `src/lib/perfil-participantes.ts`, `src/app/admin/pre-pesquisa/` |
| Vídeo/texto de orientação | `src/lib/orientacao.ts`, `src/app/gestor/pesquisas/campos-orientacao.tsx` |
| Eixo 2 | `src/lib/eixo2.ts` (valores das condições), `src/lib/avaliacao-eixo2.ts`, `src/app/gestor/eixo2/` |
| Eixo 3 | `src/lib/eixo3.ts` (correspondência de CID, ×1,10), `src/lib/levantamento-eixo3.ts`, `src/lib/planilha-eixo3.ts` |
| Painel FRPRT (cruzamento + PGR + FMEA) | `src/lib/painel-frprt.ts`, `src/app/gestor/painel/` |
| FMEA e prazos | `src/lib/fmea.ts`, `src/lib/prazos.ts`, admin `severidade/` e `prazos/` |
| Plano de ação (5W2H + PDCA) | `src/lib/plano-acao.ts`, `src/lib/plano-acao-util.ts`, `src/lib/plano-acao-export.tsx`, `src/app/gestor/plano/` |
| PDFs | `relatorio-pdf.tsx` (Eixo 1), `relatorio-frprt-pdf.tsx` (`PaginasFrprt`), `cartoes-pdf.tsx`, `plano-acao-export.tsx` (`PaginaPlano`) |
| Relatório completo | `src/lib/relatorio/relatorio-completo.ts` (dados, rascunho, emissão), `relatorio-completo-pdf.tsx`, `src/app/gestor/painel/relatorio-completo/` |
| Metodologia (fonte única) | `src/lib/relatorio/metodologia.ts` + `parametros.ts`; gera `docs/metodologia-final.md` (`scripts/gerar-metodologia.ts`) e entra no relatório completo |
| Consultores / textos do relatório | `src/lib/consultores*.ts`, `src/lib/textos-relatorio.ts`, admin `consultores/` e `textos/` |
| Empresas (editar/inativar/excluir) | `src/lib/workspace.ts`, `src/app/admin/` |
| Uploads (logos e PDFs emitidos) | `src/lib/upload.ts` → pasta `uploads/` (fora de `public/`), servida por `src/app/uploads/[arquivo]/route.ts` |
| Catálogo (seed) | `prisma/seed.ts` + `prisma/seed-data/*.json` (perguntas v2, Eixo 2, matriz CID, severidade, situações do PGR) |

Documentação: `docs/README.md` (índice), `manual-de-uso.md`, `metodologia.md`, `metodologia-final.md`,
`Metodologia-FRPRT.docx` (documento final v1.0 entregue ao cliente), `arquitetura.md`, `operacao.md`.

---

## 4. Decisões do cliente — não reverter sem pedido novo

- **Índice final** = Eixo 1 (média 1–5) × fator do Eixo 2 (0,80–1,00) × fator do Eixo 3 (×1,10 com atestado
  "Sim" compatível). Faixas: até 3,00 / até 4,00 / acima.
- **PGR por situação (opção B):** só as situações com `Pergunta.vaiParaPgr` (hoje 8: perguntas 8, 10, 12, 13, 31,
  32, 33, 34) entram no PGR, com índice próprio por setor > 3,00. Os 13 fatores, mesmo > 4,00, vão só para o plano de ação.
- **Mínimo de anonimato = 3** (todas as pesquisas), com a regra do segundo menor grupo.
- **Pré-pesquisa:** quando ligada, é **obrigatória** (sem pular); "Prefiro não responder" só na pergunta sobre sexo;
  idade/peso/altura em faixas. Gestor vê só totais separados; cruzamento só para admin; relatórios sempre separados.
- **Terminologia:** antes da FMEA = "índice" (Índice baixo/médio/alto, Índice final); depois da FMEA "risco" só
  nos títulos; prioridade continua Alta/Média/Baixa. Mantidos: "Pesquisa de Riscos Psicossociais", "Fatores de Risco
  Psicossociais Relacionados ao Trabalho", "Fator de risco PGR", "Sem risco indicado / Risco existente",
  "Riscos existentes que vão para o PGR".
- **Eixo 3 (revisto em nov/2026):** a planilha aceita a **matrícula** (opcional), mostrada só na tela do Eixo 3 — nunca em relatórios,
  PDF ou Excel. Os indicadores contam **colaboradores com atestado** (mesma matrícula = 1 por setor; linha sem matrícula = 1 pessoa),
  com o total de atestados ao lado; só atestado "Sim" agrava. Levantamentos antigos (sem matrícula) seguem como estavam.
- **Distribuição das respostas:** destaque pela NOSSA metodologia (≥ 50% em Frequentemente/Sempre); não entra no relatório.
- **Relatório completo:** só a consultoria (admin na visão de gestor) redige e emite; versões gravadas e imutáveis;
  assinatura digital é feita fora, depois da emissão; dossiê da legislação = espaço editável no admin (em elaboração).
- **Metodologia aprovada** pelo cliente (documento final v1.0 em `docs/Metodologia-FRPRT.docx`).

---

## 5. Fluxo de trabalho combinado

1. Analisar o pedido → **trazer interpretação, dúvidas e sugestões de melhoria antes do plano**.
2. Plano com **impactos e potenciais bugs** → aprovação do Stefanos.
3. Branch novo a partir do `main` → implementar em etapas com commit → testes (tsc, vitest, E2E) → conferência
   visual (telas e PDFs rasterizados).
4. Stefanos testa local (http://localhost:3000) e aprova → merge `--no-ff` no `main` → push.
5. Deploy pelo guia `C:\Users\Stefanos\.claude\docs\deploy-vps.md`:
   **sempre confirmar o subdomínio**; backup do banco se houver schema; `git pull` + `docker compose up -d --build`;
   scripts de dados e seed **dentro do container** (`docker compose exec -T app npx tsx scripts/...`,
   `docker compose exec -T app npx prisma db seed`); provar o deploy com `grep` de texto novo em `/app/.next`;
   `/api/health`; terminar pedindo **hard refresh (Ctrl+Shift+R)**.
- Commits terminam com a linha de atribuição indicada pela sessão (hoje `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- Responder sempre em português; texto para o usuário sem jargão desnecessário.

---

## 6. Armadilhas já encontradas (economize tempo)

- **Dev server com código velho:** depois de mudar schema, reinicie; se uma rota nova der 404 sem motivo,
  pare o servidor, apague `.next/dev` e suba de novo (cache do Turbopack).
- **React 19 limpa formulários** depois de cada envio por action: devolva os valores digitados no estado
  (`valoresDigitados` em `src/lib/orientacao.ts`) ou use campos controlados.
- **Heredoc do Bash quebra** com crases, `$` e caracteres especiais: escreva scripts de patch (Python/TS) com a
  ferramenta Write no scratchpad e execute.
- **E2E:** rode com `--workers=1`; "aqueça" `/login`, `/admin`, `/gestor` com `curl` antes; se o admin ficou
  "acessando como gestor", o login dos testes falha — clique "Sair e voltar para admin".
- **Capturas de tela:** o painel do navegador às vezes não desenha; use um script Playwright (`@playwright/test`
  → `chromium`) salvo dentro do projeto (fora de `test-results/`) e rodado com `node`.
- **PDF (Helvetica/WinAnsi):** símbolos como ≥ → ≈ − e emojis não existem — passe o texto por `paraPdf`.
  `react-pdf` não lê WebP (logo WebP sai sem logo; a tela avisa).
- **`next build`** reescreve `next-env.d.ts` → `git checkout next-env.d.ts` depois.
- **ESLint** do projeto está com a config quebrada (pré-existente); use `tsc` e os testes.
- **Word/PDF no Windows:** `soffice` não funciona aqui; converta .docx→.pdf pelo Word via PowerShell (COM) e
  rasterize com `pymupdf` (Python) para conferir.
- **Server Actions com `.bind(...)`:** argumentos ligados vêm do navegador (não são criptografados). Ações novas
  devem resolver empresa/resposta pela sessão/cookie, nunca por id vindo do formulário. (A jornada antiga ainda
  recebe `respostaId` assim — risco baixo, cuid imprevisível; vale corrigir quando mexer lá.)
- **Excluir empresa:** apaga em ordem explícita (pesquisas → ações → Eixos 2/3 → empresa); um único DELETE dispara
  conflito de chave em `Resposta_codigoAcessoId_fkey`.

---

## 7. Pendências em aberto

- **CIDs do capítulo Z no Eixo 3** — proposta enviada (`docs/Inclusao-CIDs-Z-Eixo3.docx`); aguardando o cliente.
- **Dossiê da legislação** — cliente elaborando; preencher em Admin → Textos do relatório.
- **Consultores reais** — cadastrar em produção (Admin → Consultores) antes do primeiro relatório completo.
- **Visão do gestor na pré-pesquisa** — opções com menos de 3 pessoas aparecem com a contagem (ex.: "1"); foi
  oferecido escondê-las, sem decisão.
- **Limpeza** — há 17 branches locais antigos, todos já no `main` (podem ser apagados se o Stefanos quiser).
- **Novas solicitações** — `Modificacoes/` (ver seção 1): mudanças em todos os eixos e nos relatórios.

---

## 8. Prompt para iniciar a nova sessão

```text
Vamos continuar o desenvolvimento da plataforma FRPRT (D:\2026-v2\Ergonomic\Pesquisa).

Antes de qualquer coisa, leia:
1. docs/HANDOFF.md (estado atual, mapa do código, decisões do cliente, fluxo e armadilhas);
2. a memória do projeto e C:\Users\Stefanos\.claude\docs\deploy-vps.md;
3. AGENTS.md (versão nova do Next.js).

Recebi novas solicitações de melhoria do cliente, com mudanças em todos os eixos e nos relatórios.
Os documentos estão na pasta Modificacoes/:
- Solicitacao_Melhorias_Sistema_Avaliacao_Psicossocial.docx
- Relatório sistema Fatores de Risco Psicossocial.docx

Quero que você:
1. Leia os dois documentos com bastante atenção (inclusive imagens e tabelas);
2. Traga sua interpretação item por item, as dúvidas que precisar esclarecer e sugestões de
   melhoria — sem escrever código ainda;
3. Aponte onde cada pedido conflita com as decisões já tomadas pelo cliente (seção 4 do handoff);
4. Depois das minhas respostas, traga o plano de implementação em etapas, com impactos e
   potenciais bugs, para eu aprovar.

Siga o fluxo combinado: branch novo, eu testo local, aprovo, merge no main e deploy na VPS
(sempre confirmando o subdomínio).
```
