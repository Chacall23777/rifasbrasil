import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

const rifasRecentesQuery = queryOptions({
  queryKey: ["rifas", "recentes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("rifas")
      .select("id, slug, titulo, foto_principal, valor_numero, quantidade_numeros")
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(rifasRecentesQuery),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Hero />
      <Beneficios />
      <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Carregando rifas…</div>}>
        <RifasRecentes />
      </Suspense>
      <ComoFunciona />
      <CTAFinal />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden gradient-hero text-white">
      <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-brand-yellow" />
            100% grátis · Receba direto no seu PIX
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
            Crie sua rifa online <span className="text-brand-yellow">em minutos</span>
          </h1>
          <p className="mt-4 text-lg text-white/90 md:text-xl">
            Compartilhe o link, venda seus números e receba os pagamentos direto na sua chave PIX. Sem taxas, sem intermediário.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-brand-yellow text-secondary-foreground hover:bg-brand-yellow/90">
              <Link to="/auth">
                Criar rifa grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Beneficios() {
  const itens = [
    { icon: CheckCircle2, title: "Sem taxas", desc: "Nós não intermediamos dinheiro. O comprador paga direto no seu PIX." },
    { icon: Zap, title: "Rápido de criar", desc: "Preencha os dados da rifa, publique e receba o link para compartilhar." },
    { icon: ShieldCheck, title: "Você no controle", desc: "Aprove os comprovantes, gerencie compradores e sorteie quando quiser." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="grid gap-6 md:grid-cols-3">
        {itens.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RifasRecentes() {
  const { data } = useSuspenseQuery(rifasRecentesQuery);
  if (!data || data.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold">Rifas recentes</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((r) => (
          <Link
            key={r.id}
            to="/r/$slug"
            params={{ slug: r.slug }}
            className="group overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-lift"
          >
            <div className="aspect-video overflow-hidden bg-muted">
              {r.foto_principal ? (
                <img
                  src={r.foto_principal}
                  alt={r.titulo}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-4xl">🎟️</div>
              )}
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 font-semibold">{r.titulo}</h3>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-bold text-primary">R$ {Number(r.valor_numero).toFixed(2)}</span>
                <span className="text-muted-foreground">{r.quantidade_numeros} números</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ComoFunciona() {
  const passos = [
    { n: 1, t: "Crie sua conta", d: "Cadastro grátis com email ou Google." },
    { n: 2, t: "Crie a rifa", d: "Título, prêmio, número de bilhetes, valor e sua chave PIX." },
    { n: 3, t: "Compartilhe o link", d: "Envie por WhatsApp, redes sociais e receba as reservas." },
    { n: 4, t: "Aprove e sorteie", d: "Confirme os pagamentos e registre o número vencedor." },
  ];
  return (
    <section id="como-funciona" className="bg-accent/40 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-3xl font-bold">Como funciona</h2>
        <p className="mt-2 text-center text-muted-foreground">Do zero ao sorteio, sem complicação.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {passos.map((p) => (
            <div key={p.n} className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-full gradient-brand font-bold text-white">
                {p.n}
              </div>
              <h3 className="font-semibold">{p.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTAFinal() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="rounded-3xl gradient-brand p-10 text-center text-white shadow-lift">
        <h2 className="text-3xl font-bold">Pronto para criar sua primeira rifa?</h2>
        <p className="mt-2 text-white/90">Grátis para sempre. Sem cartão, sem taxas.</p>
        <Button asChild size="lg" className="mt-6 bg-brand-yellow text-secondary-foreground hover:bg-brand-yellow/90">
          <Link to="/auth">Começar agora</Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} RIFASBRASIL — Rifas online grátis</p>
        <p>Feito com 💚 no Brasil</p>
      </div>
    </footer>
  );
}
