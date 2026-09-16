# Data Model — Plataforma de Pesquisa de Riscos Psicossociais

Rascunho de schema Prisma. Segue o padrão de tenancy do CRM Alex (`Workspace` como raiz +
`workspaceId` em toda tabela de negócio) — ver `research.md` §1. Nenhum campo identificável do
colaborador respondente existe em nenhuma tabela (constituição §1).

```prisma
// ── Plataforma / tenancy ────────────────────────────────────────────────

model Workspace {
  id          String   @id @default(cuid())
  nome        String
  slug        String   @unique
  logoUrl     String?
  corPrimaria String?  // se nulo, aplicar tema cinza padrão na UI
  corSecundaria String?
  isActive    Boolean  @default(true)
  deletedAt   DateTime?
  createdAt   DateTime @default(now())

  memberships Membership[]
  setores     SetorOrg[]
  departamentos Departamento[]
  segmentos   Segmento[]
  funcoes     Funcao[]
  pesquisas   Pesquisa[]

  @@index([slug])
}

model User {
  id           String   @id @default(cuid())
  nome         String
  email        String   @unique
  passwordHash String
  isPlatformAdmin Boolean @default(false) // true = Administrador da plataforma (acessa todos os workspaces)
  createdAt    DateTime @default(now())

  memberships  Membership[]
}

enum MembershipRole {
  GESTOR   // usuário responsável pela empresa cliente
  VIEWER   // acesso só-leitura a dashboards (opcional, futuro)
}

model Membership {
  id          String         @id @default(cuid())
  userId      String
  workspaceId String
  role        MembershipRole @default(GESTOR)

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@index([workspaceId])
}

// ── Catálogo global do questionário (não pertence a nenhum workspace) ──

model Questionario {
  id        String   @id @default(cuid())
  nome      String
  versao    Int      @default(1)
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())

  blocos    Bloco[]
  pesquisas Pesquisa[]
}

model Bloco {
  id             String @id @default(cuid())
  questionarioId String
  nome           String // ex.: "Bloco 1 — Organização do Trabalho"
  ordem          Int

  questionario   Questionario @relation(fields: [questionarioId], references: [id], onDelete: Cascade)
  dimensoes      Dimensao[]

  @@index([questionarioId])
}

model Dimensao {
  id      String @id @default(cuid())
  blocoId String
  nome    String // ex.: "1. Instrução de trabalho"
  ordem   Int

  bloco       Bloco        @relation(fields: [blocoId], references: [id], onDelete: Cascade)
  fatoresRisco FatorRisco[]

  @@index([blocoId])
}

model FatorRisco {
  id         String @id @default(cuid())
  dimensaoId String
  nome       String // ex.: "Demandas de Trabalho inadequadas"

  dimensao  Dimensao   @relation(fields: [dimensaoId], references: [id], onDelete: Cascade)
  perguntas Pergunta[]

  @@index([dimensaoId])
}

enum Polaridade {
  MAIOR_PIOR // padrão: nota alta = mais exposição ao risco (as 42 perguntas atuais)
  MAIOR_MELHOR // pergunta de sentido invertido; exige reversão antes de qualquer média
}

model Pergunta {
  id                  String     @id @default(cuid())
  fatorRiscoId        String
  situacaoInvestigada String     // metadado interno, nunca exibido ao colaborador
  texto               String     // texto exibido ao colaborador (Anexo A do spec.md)
  ordemGlobal         Int        // 1..42, ordem de exibição na jornada paginada
  polaridade          Polaridade @default(MAIOR_PIOR) // ver review.md §5.1

  fatorRisco    FatorRisco     @relation(fields: [fatorRiscoId], references: [id], onDelete: Cascade)
  respostaItens RespostaItem[]

  @@index([fatorRiscoId])
}

// ── Estrutura organizacional (por empresa) ──────────────────────────────

model SetorOrg {
  id          String @id @default(cuid())
  workspaceId String
  nome        String

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  respostas Resposta[]

  @@unique([workspaceId, nome])
  @@index([workspaceId])
}

model Departamento {
  id          String @id @default(cuid())
  workspaceId String
  nome        String

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  respostas Resposta[]

  @@unique([workspaceId, nome])
  @@index([workspaceId])
}

model Segmento {
  id          String @id @default(cuid())
  workspaceId String
  nome        String

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  respostas Resposta[]

  @@unique([workspaceId, nome])
  @@index([workspaceId])
}

model Funcao {
  id          String @id @default(cuid())
  workspaceId String
  nome        String

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  respostas Resposta[]

  @@unique([workspaceId, nome])
  @@index([workspaceId])
}

// ── Pesquisa, licenças e respostas ───────────────────────────────────────

enum PesquisaStatus {
  RASCUNHO
  AGENDADA
  ABERTA
  ENCERRADA
}

model Pesquisa {
  id                 String         @id @default(cuid())
  workspaceId        String
  questionarioId     String
  nome               String
  slug               String // único por workspace — vai na URL impressa no cartão, nunca muda depois de gerado
  status             PesquisaStatus @default(RASCUNHO)
  dataInicio         DateTime
  dataFim            DateTime
  licencasSolicitadas Int
  limiteSupressaoGrupo Int          @default(5) // constituição §3
  createdAt          DateTime       @default(now())

  workspace    Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  questionario Questionario @relation(fields: [questionarioId], references: [id])
  codigos      CodigoAcesso[]

  @@index([workspaceId])
}

enum CodigoTipo {
  PARTICIPANTE
  TESTE
}

enum CodigoStatus {
  DISPONIVEL
  INICIADO
  CONCLUIDO
  EXPIRADO
  BLOQUEADO
}

model CodigoAcesso {
  id          String       @id @default(cuid())
  pesquisaId  String
  codigo      String       @unique // opaco, não sequencial (constituição §1)
  tipo        CodigoTipo
  status      CodigoStatus @default(DISPONIVEL)
  createdAt   DateTime     @default(now())

  pesquisa Pesquisa  @relation(fields: [pesquisaId], references: [id], onDelete: Cascade)
  resposta Resposta?

  @@index([pesquisaId])
  @@index([status])
}

model Resposta {
  id             String    @id @default(cuid())
  codigoAcessoId String    @unique
  setorId        String?
  departamentoId String?
  segmentoId     String?
  funcaoId       String?
  iniciadoEm     DateTime  @default(now())
  concluidoEm    DateTime?

  codigoAcesso CodigoAcesso   @relation(fields: [codigoAcessoId], references: [id], onDelete: Cascade)
  setor        SetorOrg?      @relation(fields: [setorId], references: [id])
  departamento Departamento?  @relation(fields: [departamentoId], references: [id])
  segmento     Segmento?      @relation(fields: [segmentoId], references: [id])
  funcao       Funcao?        @relation(fields: [funcaoId], references: [id])
  itens        RespostaItem[]

  @@index([setorId])
  @@index([departamentoId])
  @@index([segmentoId])
  @@index([funcaoId])
}

model RespostaItem {
  id          String   @id @default(cuid())
  respostaId  String
  perguntaId  String
  valor       Int      // 1..5
  respondidoEm DateTime @default(now())

  resposta Resposta @relation(fields: [respostaId], references: [id], onDelete: Cascade)
  pergunta Pergunta @relation(fields: [perguntaId], references: [id])

  @@unique([respostaId, perguntaId]) // permite upsert por página, sem duplicar
  @@index([perguntaId])
}
```

## Notas de implementação

- **Sem PII, ponto final.** Nenhum modelo acima tem campo de nome/e-mail/CPF/matrícula do
  colaborador. `Resposta` só guarda seleção organizacional (setor/departamento/segmento/função) e
  timestamps — nada mais.
- **Rascunho retomável**: `Resposta` é criada no primeiro `POST` de uma página do questionário
  (não precisa de ação explícita "iniciar"); `RespostaItem` é upsertado por página (`@@unique` em
  `[respostaId, perguntaId]` permite `upsert`, então reenviar a mesma página não duplica).
  `CodigoAcesso.status` vai `DISPONIVEL → INICIADO` no primeiro item salvo e `→ CONCLUIDO` só
  quando o colaborador confirma "Concluir a pesquisa" (spec.md §6) — nunca automaticamente ao
  responder a última pergunta, para dar espaço à tela de revisão.
- **Filtragem de testes**: toda query de dashboard/relatório deve filtrar
  `codigoAcesso.tipo = PARTICIPANTE` e `resposta.concluidoEm != null`. Não há flag redundante em
  `Resposta` para isso — sempre via join, para não haver duas fontes de verdade (constituição
  §3).
- **Supressão de grupos pequenos**: aplicada na camada de agregação (query/service), usando
  `Pesquisa.limiteSupressaoGrupo`, não no schema. Quando exatamente um grupo for suprimido, o
  segundo menor também é suprimido — senão o valor escondido é dedutível por subtração do total
  (`review.md` §1.1).
- **Timestamps nunca saem individualizados**: `iniciadoEm`, `concluidoEm` e
  `RespostaItem.respondidoEm` existem para operação (retomada, auditoria de integridade), mas
  nenhuma tela, API de gestor ou exportação pode expor horário de resposta individual nem permitir
  ordenar respostas por momento de envio — isso permitiria cruzamento com ponto eletrônico e
  reidentificação (`review.md` §1.3). Exportações agregadas usam data, sem hora.
- **Polaridade**: toda média/índice precisa normalizar por `Pergunta.polaridade` antes de somar.
  Hoje as 42 são `MAIOR_PIOR`, mas o cálculo já nasce preparado para o dia em que o instrumento
  ganhar uma pergunta de sentido invertido — é um erro que não dá erro, só resultado errado.
- **Import de planilha**: popula `SetorOrg`/`Departamento`/`Segmento`/`Funcao` via upsert por
  `[workspaceId, nome]`. A relação entre uma `Pesquisa` e quais desses registros "participam"
  dela é decidida no nível de UI/negócio ao selecionar setor/departamento no formulário do
  colaborador (o catálogo é do workspace; a pesquisa não precisa de uma tabela de junção própria
  a menos que se decida restringir quais setores aparecem em qual pesquisa — se esse requisito
  for confirmado como obrigatório na Fase 3, adicionar tabelas `PesquisaSetor` etc. naquele
  momento, não antes).
- **Extensão futura (Fase 2, não criada agora)**: `AgenteIA` (id, slug, nome, apiKeyHash) +
  `AgentWorkspace` (agenteId, workspaceId) — aditivo, sem alterar nenhuma tabela acima. Ver
  `research.md` §3.
