# Operação

## Ambiente local

Pré-requisitos: Node.js 22, Docker Desktop (para o PostgreSQL).

```bash
npm install
cp .env.example .env.local        # ajuste DATABASE_URL para o banco local e gere os segredos
npx prisma db push                # cria/atualiza as tabelas
npx prisma db seed                # questionários, catálogo do Eixo 2 e matriz CID
EMAIL=admin@exemplo.com SENHA=... npm run admin:create
npm run dev                       # http://localhost:3000
```

Opcional: `npm run seed:empresa-teste` cria uma empresa de demonstração com respostas simuladas.

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL |
| `AUTH_SECRET` | Assinatura da sessão (gerar por instalação) |
| `AUTH_URL` | URL pública da aplicação; precisa bater com o endereço usado no navegador |
| `RESPONDENTE_COOKIE_SECRET` | Cookie anônimo do colaborador |
| `NEXT_PUBLIC_APP_URL` | URL usada em links e QR Codes dos cartões |
| `POSTGRES_*` | Usuário, senha e banco do container de banco |

Segredos nunca são reaproveitados entre ambientes.

## Testes

```bash
npx tsc --noEmit                  # tipos
npx vitest run                    # testes de unidade (cálculos, parsers, actions)
npx next build                    # build de produção
```

Ponta a ponta (Playwright) contra um build de produção numa porta separada:

```bash
AUTH_URL=http://localhost:3200 npx next start -p 3200
BASE_URL=http://localhost:3200 npx playwright test
```

Os testes ponta a ponta usam o admin de teste e criam empresas próprias. Ao terminar, encerre o
servidor da porta 3200. Como compartilham o admin de teste, podem encerrar uma "visão de gestor"
aberta por você no navegador local.

## Fluxo de trabalho

1. Cada mudança em um branch próprio.
2. Teste local e aprovação do cliente.
3. Merge no `main` e envio ao GitHub.
4. Publicação na VPS.

## Publicação (produção)

Produção: **https://pesquisa.agtrade.com.br**. App em `/opt/pesquisa-psicossocial`, containers
`pesquisa-app` e `pesquisa-db`. O passo a passo detalhado (acesso, verificação e armadilhas
conhecidas) está no guia operacional privado do responsável pela VPS. Resumo:

1. Confirmar o subdomínio de destino.
2. **Backup do banco** antes de mudanças de schema:
   `docker exec pesquisa-db pg_dump -U pesquisa pesquisa > backups/pesquisa-AAAA-MM-DD.sql`
3. `git pull origin main` e `docker compose up -d --build`.
   O `entrypoint.sh` aplica o schema (`prisma db push`) sozinho ao subir.
4. Se o catálogo mudou (questionário, Eixo 2, matriz CID):
   `docker compose exec -T app npx prisma db seed`.
5. **Confirmar dentro do container** que o código novo está lá (procurar um texto novo em
   `/app/.next`). O status HTTP sozinho não prova o deploy.
6. `GET /api/health` deve responder 200.
7. Avisar os usuários para dar **Ctrl+Shift+R**: abas abertas antes do deploy quebram as Server
   Actions.

### Rollback

```bash
git checkout <commit-bom> && docker compose up -d --build
cat backups/<arquivo>.sql | docker exec -i pesquisa-db psql -U pesquisa -d pesquisa
```

## Backup

Não há backup automático. Os arquivos de `backups/` ficam no mesmo disco do banco e protegem
contra erro humano, não contra perda do servidor. Recomenda-se copiar periodicamente para fora da
VPS. As logos ficam no volume `pesquisa_uploads`.
