import { Symbol } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de marca — carrega o posicionamento, não só o logo. */}
      <section className="relative hidden overflow-hidden bg-graphite p-12 lg:flex lg:flex-col">
        <div className="relative z-10 flex items-center gap-3">
          <Symbol className="h-7 w-7 text-brand" />
          <span className="text-sm font-semibold tracking-tight">Triângulo Solucions</span>
        </div>

        <div className="relative z-10 mt-auto max-w-md">
          <h1 className="text-[38px] font-bold leading-[1.08] tracking-tight">
            O seu lucro
            <br />
            já existe.
            <br />
            <span className="text-brand">Ele só está preso.</span>
          </h1>
          <div className="my-7 h-[3px] w-16 bg-brand" />
          <p className="text-[15px] leading-relaxed text-muted">
            Este é o painel interno de produção de conteúdo. Cada cliente é um projeto,
            cada peça é uma tarefa e cada tarefa carrega o fluxo completo — de DEMANDAR
            até PUBLICAÇÃO.
          </p>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-faint">
            Mapear · Resolver · Lucrar
          </p>
        </div>

        {/* Símbolo em marca d'água */}
        <Symbol className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] text-white/[0.025]" />
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[360px]">
          <div className="mb-8 lg:hidden">
            <Symbol className="h-8 w-8 text-brand" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Entrar no Gestor</h2>
          <p className="mt-1.5 text-sm text-muted">
            Acesso restrito à equipe da Triângulo.
          </p>
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}
