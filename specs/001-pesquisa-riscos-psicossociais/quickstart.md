# Quickstart

## Rodar localmente (dev)

```bash
cp .env.example .env          # preencher DATABASE_URL local, AUTH_SECRET, etc.
docker compose -f docker-compose.dev.yml up -d db   # só o Postgres, para dev local
npm install
npx prisma db push
npx prisma db seed            # popula o catálogo das 42 perguntas a partir do xlsx
EMAIL=admin@exemplo.com SENHA=senhaForte NOME="Seu Nome" npm run admin:create
npm run dev                   # http://localhost:3000 — entrar em /login
```

## Primeiro deploy em pesquisa.agtrade.com.br (Fase 1 — ambiente de teste)

Pré-requisitos (confirmar antes, não assumir — `research.md` §2):
- Traefik já rodando na VPS agtrade, com a rede externa correta (assumido
  `traefik_traefik-public`) e um certresolver `letsencrypt` configurado.
- DNS: registro A de `pesquisa.agtrade.com.br` apontando para o IP da VPS, já propagado.

```bash
# na VPS
mkdir -p /opt/pesquisa-psicossocial
# enviar o código (scp/rsync), sem node_modules/.next/.env
cd /opt/pesquisa-psicossocial
cp .env.example .env      # gerar TODOS os segredos do zero (openssl rand ...), nunca reaproveitar de outro app
docker compose up -d --build
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed
# criar o primeiro usuário PLATFORM_ADMIN (script one-off, igual ao padrão OSManager/CRM)
```

Verificar:
```bash
curl -sI https://pesquisa.agtrade.com.br | head -1     # espera 200
```

## Replicar na VPS do cliente (Fase 2)

Seguir `PLANO-INSTALACAO-PESQUISA.md` (a escrever na Fase 9 de `tasks.md`) — mesmo modelo do
pacote em `C:\Users\Stefanos\.claude\projects\Inatalar-Nova_VPS\PLANO-INSTALACAO.md`: sem
segredos reais, gates humanos explícitos, tudo gerado do zero para aquele cliente.
