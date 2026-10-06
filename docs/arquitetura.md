# Arquitetura

## Stack

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Estilo | Tailwind CSS 3 |
| Banco | PostgreSQL + Prisma 7 (adapter `@prisma/adapter-pg`) |
| Autenticação | NextAuth 5 (credenciais, sessão JWT), senhas com bcrypt |
| Planilhas | ExcelJS (modelos e importação) |
| PDF | `@react-pdf/renderer` (cartões, relatório da pesquisa, relatório FRPRT) |
| QR Code | `qrcode` |
| Testes | Vitest (unidade) e Playwright (ponta a ponta) |
| Infra | Docker Compose atrás do Traefik (HTTPS Let's Encrypt), VPS Linux |

> Este Next.js tem mudanças em relação a versões anteriores (ex.: o middleware chama-se
> `src/proxy.ts`). Consulte `node_modules/next/dist/docs/` antes de alterar convenções.

## Estrutura de pastas

```
src/
  app/
    login/                      tela de login (admin e gestor)
    admin/                      empresas, edição, pesos das perguntas, severidade FMEA
    gestor/
      page.tsx                  lista de pesquisas (início do gestor)
      estrutura/                setores e departamentos (+ planilha modelo)
      pesquisas/[id]/           pesquisa, licenças, cartões, painel, relatório, respostas
      eixo2/                    avaliação das medidas de controle
      eixo3/                    levantamentos de atestados CID-F
      painel/                   Painel FRPRT e relatório PDF
    p/[workspaceSlug]/[pesquisaSlug]/   jornada pública do colaborador
    api/health/                 verificação de saúde (usada no deploy)
  components/
    shell/                      barra superior, menu em botões, aviso de "visão de gestor"
    ui/                         botões, tabelas, campos, selos
    frprt/                      ícones dos fatores
  lib/                          regras de negócio e cálculos (ver metodologia.md)
  proxy.ts                      proteção de /admin e /gestor; retira o código da URL em /p/*
prisma/
  schema.prisma                 modelo de dados
  seed.ts + seed-data/          questionários v1/v2, catálogo do Eixo 2, matriz CID
scripts/                        criar admin, empresa de demonstração, realinhamento v2
e2e/                            testes Playwright
specs/, .specify/               especificação e constituição do projeto
docs/                           esta documentação
```

## Modelo de dados (resumo)

| Área | Modelos |
|---|---|
| Empresas e acesso | `Workspace` (nome, slug, logo, cores, `isActive`), `User`, `Membership` (papel, `impersonada`) |
| Questionário | `Questionario` (versão, ativo), `Bloco`, `Dimensao` (fator), `FatorRisco`, `Pergunta` (polaridade, peso) |
| Estrutura | `SetorOrg` (nº de colaboradores), `Departamento`; `Segmento` e `Funcao` só históricos |
| Eixo 1 | `Pesquisa` (datas, licenças, limite de supressão), `CodigoAcesso` (tipo, status), `Resposta`, `RespostaItem` |
| Eixo 2 | `QuestaoEixo2`, `AvaliacaoEixo2`, `AvaliacaoEixo2Setor`, `RespostaEixo2` (condição, plano de ação), `PraticaAdicional` |
| Eixo 3 | `MatrizCidSituacao` (CIDs por pergunta), `LevantamentoEixo3` (período, declaração, hash do arquivo), `OcorrenciaEixo3` |
| FMEA | `SeveridadeFator` (severidade-base 1–5 e justificativa por dimensão; editada em `/admin/severidade`), `PrazoPrioridade` (prazos padrão por prioridade; `/admin/prazos`) |
| Plano de ação | `AcaoPlano` (5W2H, fase PDCA, eficácia, custo em centavos, origem no Eixo 2, ação corretiva), `AcaoPlanoSetor` (setores e índice-base para o antes × depois), `AcaoPlanoHistorico` (quem alterou o quê) |

O catálogo (questionário, Eixo 2 e matriz CID) é global e versionado. Os dados de negócio são todos
por `workspaceId`.

## Segurança e LGPD

**Isolamento entre empresas**
- Toda página e Server Action resolve o workspace pela sessão e pela `Membership`
  (`getActor` + `getWorkspaceDoGestor`), nunca por um id vindo do navegador.
- Recursos de outra empresa respondem **404** (não revelam que existem).
- "Acessar como gestor" cria uma `Membership` temporária marcada como `impersonada`, usando o
  mesmo caminho de acesso de um gestor real.
- Alteração de pesos exige administrador da plataforma.

**Anonimato do colaborador**
- Nenhuma tabela guarda nome, e-mail, CPF ou matrícula do colaborador. O código de acesso é o
  único identificador.
- O código que chega pela URL do QR é retirado da URL antes da página carregar e vai para um
  cookie `httpOnly` de curta duração.
- Códigos sem caracteres ambíguos (sem 0/O, 1/I/L), gerados com verificação de colisão.
- Supressão de grupos pequenos com proteção contra dedução por subtração.
- Horário individual de resposta nunca é exibido.

**Dados de saúde (Eixo 3)**
- CID é dado sensível (LGPD art. 5º, II). Só o gestor da própria empresa e o admin acessam.
- Colunas que identificariam o trabalhador são ignoradas na importação, e a tela avisa.
- O arquivo enviado não é guardado; ficam só o nome e o hash, para auditoria.
- Limites contra arquivos maliciosos: 5 MB, 5.000 linhas, verificação de que é mesmo .xlsx.

**Uploads de logo**
- PNG, JPEG ou WebP até 2 MB, validados pelos bytes do arquivo (SVG recusado).
- Gravados em `public/uploads/` (volume Docker `pesquisa_uploads`).

## Pontos em aberto

- SMTP e tarefas agendadas estão previstos (`.env.example`, dependências) mas não são usados.
- Plano de segurança corporativa (2FA por e-mail, sessão de 48 h, trilha de auditoria) foi
  planejado e ainda não implementado.
