import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Ticket, ShoppingCart, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Painel — RIFASBRASIL" }] }),
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: rifas } = useQuery({
    queryKey: ["dashboard", "minhas-rifas", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rifas")
        .select("id, titulo, slug, status, quantidade_numeros, valor_numero, created_at")
        .eq("organizador_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user.id],
    queryFn: async () => {
      // Todos os números das minhas rifas (org policy permite ler)
      const { data: rows, error } = await supabase
        .from("rifa_numeros")
        .select("comprador_id, status, rifa_id, rifas!inner(valor_numero, organizador_id)")
        .eq("rifas.organizador_id", user.id);
      if (error) throw error;
      let arrecadado = 0;
      let vendidos = 0;
      let pendentes = 0;
      const participantes = new Set<string>();
      (rows || []).forEach((r: any) => {
        const s = (r.status || "").toLowerCase();
        const valor = Number(r.rifas?.valor_numero || 0);
        if (s === "aprovado") {
          arrecadado += valor;
          vendidos += 1;
          if (r.comprador_id) participantes.add(r.comprador_id);
        } else if (s === "reservado") {
          pendentes += 1;
        }
      });
      return { arrecadado, vendidos, pendentes, participantes: participantes.size };
    },
  });

  const cards = [
    { to: "/criar-rifa", icon: PlusCircle, title: "Criar nova rifa", desc: "Comece uma rifa em minutos" },
    { to: "/minhas-rifas", icon: Ticket, title: "Minhas rifas", desc: "Gerencie e acompanhe" },
    { to: "/rifas-participadas", icon: ShoppingCart, title: "Rifas participadas", desc: "Suas compras" },
    { to: "/perfil", icon: UserIcon, title: "Meu perfil", desc: "Dados e chave PIX" },
  ];

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Olá 👋</h1>
        <p className="text-muted-foreground">O que vamos fazer hoje?</p>

        {stats && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Arrecadado (aprovado)" value={`R$ ${stats.arrecadado.toFixed(2)}`} />
            <StatCard label="Números vendidos" value={String(stats.vendidos)} />
            <StatCard label="Participantes" value={String(stats.participantes)} />
            <StatCard label="Pendentes de aprovação" value={String(stats.pendentes)} highlight={stats.pendentes > 0} />
          </div>
        )}


        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="group rounded-2xl border bg-card p-5 shadow-soft transition hover:shadow-lift hover:border-primary/40"
            >
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </Link>
          ))}
        </div>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">Suas rifas recentes</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/minhas-rifas">Ver todas</Link>
            </Button>
          </div>

          {!rifas || rifas.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
              <p className="text-muted-foreground">Você ainda não criou nenhuma rifa.</p>
              <Button asChild className="mt-4">
                <Link to="/criar-rifa">Criar minha primeira rifa</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y rounded-2xl border bg-card shadow-soft">
              {rifas.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{r.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.quantidade_numeros} números · R$ {Number(r.valor_numero).toFixed(2)} · {r.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/r/$slug" params={{ slug: r.slug }}>Ver</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
