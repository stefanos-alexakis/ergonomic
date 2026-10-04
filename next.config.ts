import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Planilha do Eixo 3 (até 5 MB, validado no parser) e logo (até 2 MB).
      // O padrão de 1 MB recusava esses envios antes de qualquer validação.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        // Jornada pública do colaborador: nenhum endereço com o código
        // de acesso pode ser enviado a terceiros via cabeçalho Referer
        // (review.md §1.2/§6 — anonimato é constituição, não detalhe).
        source: "/p/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
