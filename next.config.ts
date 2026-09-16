import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
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
