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

Código publicado em <https://github.com/stefanos-alexakis/ergonomic> — clonar direto na VPS em
vez de scp/rsync.

```bash
# na VPS
mkdir -p /opt/pesquisa-psicossocial
git clone https://github.com/stefanos-alexakis/ergonomic.git /opt/pesquisa-psicossocial
cd /opt/pesquisa-psicossocial
cp .env.example .env      # gerar TODOS os segredos do zero (openssl rand ...), nunca reaproveitar de outro app
# editar o .env: AUTH_URL e NEXT_PUBLIC_APP_URL = https://pesquisa.agtrade.com.br
docker compose up -d --build
docker compose exec app npx prisma db seed
EMAIL=<seu-email> SENHA=<senha-forte> NOME="Seu Nome" docker compose exec -e EMAIL -e SENHA -e NOME app npm run admin:create
```

Note que `prisma db push` **não** entra na lista acima — o `entrypoint.sh` já roda isso sozinho
toda vez que o container `app` sobe (ver Dockerfile/entrypoint.sh), então rodar de novo à mão é
redundante (mas inofensivo, é idempotente).

Verificar:
```bash
curl -sI https://pesquisa.agtrade.com.br | head -1     # espera 200
```

Todo o `docker build` completo (imagem + subida do container + `db push` + `db seed` +
`admin:create` + login real) foi testado localmente antes desta publicação — ver review.md
"Parte 10" para os bugs reais encontrados e corrigidos nesse processo (nenhum era visível só
olhando o código ou rodando `next build`; só apareceram rodando a imagem de produção de
verdade).

## Replicar na VPS do cliente (Fase 2)

Seguir `PLANO-INSTALACAO-PESQUISA.md` (a escrever na Fase 9 de `tasks.md`) — mesmo modelo do
pacote em `C:\Users\Stefanos\.claude\projects\Inatalar-Nova_VPS\PLANO-INSTALACAO.md`: sem
segredos reais, gates humanos explícitos, tudo gerado do zero para aquele cliente.
