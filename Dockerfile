FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
# --legacy-peer-deps: next-auth@5.0.0-beta.32 pede nodemailer ^7||^8 como
# peer opcional, mas usamos 10.x (mesma decisão do ambiente local, ver
# review.md sobre a atualização do @react-pdf/renderer).
RUN npm ci --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# next standalone só copia os arquivos rastreados pelo bundler — scripts
# externos ao bundle (prisma/seed.ts, create-admin.ts) precisam de algumas
# dependências reinstaladas (mesmo problema documentado no CRM Alex desta
# VPS). Instala num diretório isolado (package.json próprio, vazio) em vez
# de `npm install <pkgs>` direto em /app: rodar ali reconcilia contra o
# package.json inteiro do projeto e traz junto TODAS as devDependencies
# (vitest, playwright, eslint, tailwind...) — inflava a imagem de produção
# de ~300MB pra 2.7GB (achado testando a imagem local, não só o build).
RUN mkdir -p /tmp/extra-deps && cd /tmp/extra-deps \
  && npm init -y >/dev/null \
  && npm install prisma@7 pg@^8.13.0 tsx@^4.19.0 bcryptjs@^3.0.2 --legacy-peer-deps \
  && cp -r node_modules/. /app/node_modules/ \
  && cd /app && rm -rf /tmp/extra-deps
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# O client/adapter-pg puxam pacotes irmãos internos (ex:
# @prisma/driver-adapter-utils, @prisma/client-runtime-utils) que o npm
# hoisteia soltos em node_modules/@prisma — copiar só "client" e
# "adapter-pg" isolados quebra em runtime com ERR_MODULE_NOT_FOUND (achado
# rodando `prisma db seed` de verdade). Copia o escopo @prisma inteiro do
# builder em vez de adivinhar cada dependência interna.
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/entrypoint.sh ./entrypoint.sh

# "npm run admin:create" (bootstrap do primeiro PLATFORM_ADMIN em produção)
# roda scripts/create-admin.ts via tsx — sem essa cópia, o standalone build
# não traz esse script e o comando falharia na VPS na hora H.
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

# src/lib/upload.ts grava em `public/uploads/` (join(process.cwd(), "public",
# "uploads")), não em `/app/uploads` — o mkdir/chown daqui tinha que
# apontar pro caminho de verdade. Sem isso, o usuário "nextjs" batia em
# EACCES tentando criar a pasta em runtime (achado em produção, não local:
# localmente roda como usuário dono da máquina, sem essa restrição).
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "entrypoint.sh"]
