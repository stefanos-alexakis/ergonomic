import { defineConfig } from "@playwright/test";

/**
 * Se BASE_URL apontar para uma porta diferente de 3000 (ex.: rodando um
 * `next start` de teste ao lado do `next dev` normal), o servidor
 * também precisa subir com `AUTH_URL` na MESMA porta — senão o
 * middleware (`src/proxy.ts`) redireciona a limpeza do `?codigo=` da
 * jornada pública para a porta antiga (fixa em `.env.local`), que não
 * tem nada escutando, e todo `page.goto` com `?codigo=` falha com
 * ERR_CONNECTION_REFUSED (achado depurando este E2E — não é bug da
 * aplicação, só desalinhamento entre `.env.local` e a porta de teste).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  },
});
