# Handoff — Plataforma FRPRT (Pesquisa Psicossocial)

> Atualizado em 22/11/2026, depois do deploy da versão de novembro, para continuar numa sessão nova. Leia inteiro antes de mexer em
> qualquer coisa. Complementa a memória do projeto (`~/.claude/projects/D--2026-v2-Ergonomic-Pesquisa/memory/`)
> e o guia de deploy (`C:\Users\Stefanos\.claude\docs\deploy-vps.md`).

---

## 1. Estado atual (22/11/2026, depois do deploy)

| Onde | Estado |
|---|---|
| Git local (`D:\2026-v2\Ergonomic\Pesquisa`) | `main` = `origin/main` (merge `02be44a` + este handoff). Os 8 branches de novembro já estão no `main`. |
| GitHub | `stefanos-alexakis/ergonomic`, branch `main`. |
| Produção | https://pesquisa.agtrade.com.br — VPS `root@2.24.75.225`, app em `/opt/pesquisa-psicossocial`, rodando **`02be44a`** (publicado em 22/11/2026, imagem `6679130bf24c`). Seed rodado (9 sinais ISO 45003, pergunta 4 nova). |
| Backup da versão anterior | Na VPS: `backups/pesquisa-2026-11-22-pre-deploy.sql`, `backups/uploads-2026-11-22.tgz`, tag git `backup-pre-deploy-2026-11-22` (`5a58f72`) e imagem `pesquisa-app:backup-2026-11-22`. Cópia na Área de Trabalho do Stefanos: `D:\User\Desktop\Backup-FRPRT-2026-11-22\` (com `LEIA-ME.txt` de como voltar). |

**Publicado em 22/11/2026** (merge `--no-ff`, nesta ordem): `melhorias-nov2026` → `eixo2-sinais-iso45003` →
`gestao-pesquisas-eixo3` → `eixo3-cids-z` → `responsaveis-relatorio` → `relatorios-eixo1` → `relatorios-eixo2` →
`relatorio-modelo-cliente`. Em resumo: menu em gaveta; pergunta 4 nova; pergunta aberta de sugestão; etapa ISO 45003
no Eixo 2; filtro de empresas no admin; matrícula e contagem por colaborador no Eixo 3; gestão de pesquisas
(prorrogar, arquivar, excluir com carência); CIDs Z; outros CIDs só na contagem; responsáveis do relatório; páginas
Relatórios Eixo 1 e Eixo 2; explicação do score do Eixo 2; cálculo com 2 casas e Eixo 1 pela média dos 13 fatores;
fator 11 fora da FMEA (Lei 14.457); **relatório final no modelo da cliente**; PDFs avulsos dos Eixos 2 e 3.

**Para voltar à versão anterior**, se aparecer bug: `docker tag pesquisa-app:backup-2026-11-22 pesquisa-app:latest &&
docker compose up -d --no-build app` (o schema novo é só aditivo; a versão antiga roda com ele). O dump só em caso
de dados danificados — restaurar apaga o que foi gravado depois do deploy.

Fora do git de propósito:
- `scripts/seed-empresa-homologacao.ts` — cria a empresa de teste local; a linha 1 tem o login de teste.
- `scripts/seed-lancamento-horizonte.ts` — lançamento completo simulado (3 eixos) na empresa de teste local.
- `test-results/` (o Playwright apaga a pasta a cada execução — não guarde nada lá) e `.claude/`.
- `Modificacoes/` — solicitações do cliente de 19/11/2026, **já analisadas e implementadas** (o modelo de
  relatório virou o relatório final; ver seção 4).
- Bancos locais de teste `pesquisa_push_teste` e `pesquisa_push_teste2` (simulação do `db push`; podem ser apagados).

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
| Responsáveis do relatório (por empresa, sem login) | `src/lib/responsaveis-relatorio*.ts`, `src/app/admin/empresas/[id]/editar/responsaveis-form.tsx`; retrato em `RelatorioEmitido.responsaveis` |
| Consultores / textos do relatório | `src/lib/consultores*.ts`, `src/lib/textos-relatorio.ts`, admin `consultores/` e `textos/` |
| Empresas (editar/inativar/excluir) | `src/lib/workspace.ts`, `src/app/admin/` |
| Uploads (logos e PDFs emitidos) | `src/lib/upload.ts` → pasta `uploads/` (fora de `public/`), servida por `src/app/uploads/[arquivo]/route.ts` |
| Catálogo (seed) | `prisma/seed.ts` + `prisma/seed-data/*.json` (perguntas v2, Eixo 2, matriz CID, severidade, situações do PGR) |

Documentação: `docs/README.md` (índice), `manual-de-uso.md`, `metodologia.md`, `metodologia-final.md`,
`Metodologia-FRPRT.docx` (documento final v1.0 entregue ao cliente), `arquitetura.md`, `operacao.md`.

---

## 4. Decisões do cliente — não reverter sem pedido novo

- **Pesquisas do Eixo 1 (nov/2026):** só o encerramento é editável (prorrogar); depois de respostas, não antecipa. Abas Abertas ·
  Concluídas (pelo encerramento) · Arquivadas (manual). Arquivada não recebe respostas e some dos seletores. Exclusão direta se nenhum
  código de participante foi usado; senão, pedido por escrito → arquivada 30 dias → exclusão definitiva com 2ª confirmação (nada apaga
  sozinho). Relatórios emitidos ficam. Só gestor e admin.

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
- **Relatório final no modelo da cliente (nov/2026):** `/gestor/painel/relatorio-final` (+ `src/lib/relatorio/relatorio-final*.ts(x)`, `textos-modelo.ts`, `eixo2-relatorio.ts`). Fontes e conclusão compartilhadas com o relatório completo; textos novos no `RelatorioRascunho` (nulo = texto gerado pelo sistema). `RelatorioEmitido.modelo` = COMPLETO | FINAL, numeração única por empresa (trocar o índice único pediria `--accept-data-loss` no boot da VPS). PDFs avulsos dos Eixos 2 e 3. **@react-pdf:** cabeçalho de tabela `fixed` + `minPresenceAhead` num documento longo quebra a geração ("unsupported number") — o relatório final não usa nenhum dos dois e dá página própria a cada distribuição.
- **Cálculo conferível (nov/2026):** 2 casas em cada etapa (`arredondar2`/`media2` em `score-final.ts`); Eixo 1 do grupo = média dos 13 fatores também no painel da pesquisa (`indiceDoGrupo`); painel resumido mostra multiplicador (×0,81) e efeito em pontos.
- **Lei 14.457 (nov/2026):** fator 11 fora da FMEA (`FATOR_FORA_DA_FMEA`), termômetro em `painel.violencia`; situações dele não geram cards do PGR.
- **Eixo 3 (nov/2026):** outros CIDs só contagem (`cid = "OUTRO"`, sem código/descrição/justificativa/matrícula); relação "relacionado / parcialmente / não relacionado" (enum continua SIM/INCONCLUSIVO/NAO).
- **Relatórios Eixo 2 (nov/2026):** página-atalho `/gestor/relatorios-eixo2` (menu Relatórios + link no Eixo 2) e página fixa `/gestor/eixo2/como-funciona` explicando o score; resumo novo no topo do resultado. **Regra de cálculo inalterada:** "Não se aplica" segue 0,80 (igual a eficaz); inexistente 1,00 (sem atenuante). Houve uma interpretação errada (N.A. = 1,00) que foi desfeita pelo cliente.
- **Relatórios Eixo 1 (nov/2026):** página-atalho `/gestor/relatorios-eixo1` (menu Relatórios + link no Eixo 1). Lista pesquisas não arquivadas/não excluídas; link só com respostas concluídas ≥ mínimo da pesquisa, senão "Aguardando respostas". Os painéis seguem em `/gestor/pesquisas/[id]/dashboard`.
- **Responsáveis do relatório (nov/2026):** cadastro por empresa (admin), sem login; marca "consta no próximo relatório" + ordem; e-mail e celular saem no PDF; marca permanece após emitir; retrato imutável na versão emitida.
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
- **`db push` no boot da VPS** roda sem flags: qualquer mudança que ele classifique como "possível perda de dados"
  (ex.: trocar um índice único, mesmo sem dados afetados) faz o container **não subir**. Antes de publicar, simule:
  banco novo com o schema do `main` e, por cima, `npx prisma db push < /dev/null` com o schema novo. O Prisma
  bloqueia `--force-reset` vindo do agente (pede consentimento explícito) — use um banco novo em vez de reset.
- **@react-pdf:** cabeçalho de tabela `fixed` junto com `minPresenceAhead` num documento longo quebra a geração
  (`unsupported number: -1.77e21` em `renderBorders`). O relatório final não usa nenhum dos dois e dá página própria a
  cada distribuição do Eixo 1. Hifenização automática segue regras do inglês ("Nun-ca"): desligada com
  `Font.registerHyphenationCallback`. Para achar a página que quebra, gere por partes (filtro temporário por página).
- **E2E com `getByText("0100")`** casa trechos: células vizinhas ("4,00" + "100%") e o estilo de fonte que o modo dev
  do Next injeta ("unicode-range: U+0100…"). Use `{ exact: true }` dentro de `getByRole("main")`.
- **Mensagem de sucesso que fica na tela** ("Rascunho salvo.") não prova o 2º envio: no E2E, espere o banco com `expect.poll`.
- **Excluir empresa:** apaga em ordem explícita (pesquisas → ações → Eixos 2/3 → empresa); um único DELETE dispara
  conflito de chave em `Resposta_codigoAcessoId_fkey`.

---

## 7. Pendências em aberto

- **Avisar o cliente sobre a versão publicada em 22/11/2026:** índices do Eixo 1 por setor mudam um pouco (média dos
  13 fatores, 2 casas); rascunhos do Eixo 2 só concluem depois de confirmar a etapa ISO 45003; o painel abre com a
  avaliação concluída mais recente; fator 11 fora da FMEA; planilha do Eixo 3 aceita outros CIDs (só contagem) e os
  termos "relacionado / parcialmente / não relacionado"; pedir hard refresh (Ctrl+Shift+R).
- **Conferir em produção, logado:** pré-visualização do Relatório final de uma empresa real (não testado logado na VPS).
- **CIDs do capítulo Z no Eixo 3** — publicados conforme a proposta (`docs/Inclusao-CIDs-Z-Eixo3.docx`), **ainda sem
  validação formal do cliente** (seção 7 do documento: Z73.0/Z73.3, uso de substâncias, agentes físicos, ocultar
  sensíveis na lista). Tabela em `src/lib/cids-z.ts`; ajustar lá se o cliente mudar algo.
- **Critério O da FMEA** — o quadro de aspectos metodológicos do modelo diz que frequência de respostas não deve virar
  probabilidade; a nota O é a média do Eixo 1. Mantido por decisão da consultoria; o lembrete aparece só na
  pré-visualização do relatório final (`NOTA_INTERNA_FMEA` em `textos-modelo.ts`).
- **Word da metodologia** (`docs/Metodologia-FRPRT.docx`, v1.0) desatualizado: 2 casas, Eixo 1 pela média dos 13
  fatores, fator 11 fora da FMEA, CIDs Z e outros CIDs. O texto-fonte (`src/lib/relatorio/metodologia.ts` e
  `docs/metodologia.md`) já está atualizado; gerar uma v1.1 se o cliente pedir.
- **Dossiê da legislação** — o relatório final usa o texto do modelo da cliente (`textos-modelo.ts`); o espaço em
  Admin → Textos do relatório continua valendo só para o relatório completo.
- **Consultores reais** — cadastrar em produção (Admin → Consultores) antes do primeiro relatório completo.
- **Visão do gestor na pré-pesquisa** — opções com menos de 3 pessoas aparecem com a contagem (ex.: "1"); foi
  oferecido escondê-las, sem decisão.
- **Limpeza** — há 24 branches locais antigos, todos já no `main` (podem ser apagados se o Stefanos quiser).

---

## 8. Prompt para iniciar a nova sessão

```text
Vamos continuar o desenvolvimento da plataforma FRPRT (D:\2026-v2\Ergonomic\Pesquisa).

Antes de qualquer coisa, leia:
1. docs/HANDOFF.md (estado atual, mapa do código, decisões do cliente, fluxo e armadilhas);
2. a memória do projeto e C:\Users\Stefanos\.claude\docs\deploy-vps.md;
3. AGENTS.md (versão nova do Next.js).

A versão de novembro já está publicada (ver seção 1). Vou passar as próximas modificações em partes.
Para cada uma: traga primeiro seu entendimento e as dúvidas (sem código), aponte conflitos com as
decisões do cliente (seção 4 do handoff) e, depois das minhas respostas, o plano em etapas com
impactos e potenciais bugs, para eu aprovar.

Siga o fluxo combinado: branch novo, eu testo local, aprovo, merge no main e deploy na VPS
(sempre confirmando o subdomínio).
```
