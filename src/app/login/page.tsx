import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">
            Pesquisa Psicossocial
          </p>
          <h1 className="text-xl font-semibold text-zinc-900">Entrar</h1>
          <p className="text-sm text-zinc-500 mt-1">Acesso de administrador ou gestor da empresa.</p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
