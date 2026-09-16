#!/bin/sh
set -e

echo "Aplicando schema do banco (prisma db push)..."
# Prisma 7 removeu a flag --skip-generate (achado testando a imagem local
# de verdade) — sem problema pular o generate aqui mesmo assim, o client
# já foi gerado no build (Dockerfile: RUN npx prisma generate).
npx prisma db push

echo "Iniciando aplicação..."
exec node server.js
