import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
          Pesquisa Psicossocial
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-3">
          Plataforma de Pesquisa de Riscos Psicossociais
        </h1>
        <p className="text-sm text-zinc-500 mb-8">
          Se você é colaborador e recebeu um cartão de acesso, use o endereço e o código
          impressos nele. Esta página é usada apenas por administradores e gestores.
        </p>
        <Link href="/login">
          <Button>Entrar</Button>
        </Link>
      </div>
    </main>
  );
}
