import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/minhas-rifas")({
  component: MinhasRifas,
  head: () => ({ meta: [{ title: "Minhas rifas — RIFASBRASIL" }] }),
});

function MinhasRifas() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["minhas-rifas", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rifas")
        .select("id, titulo, slug, status, quantidade_numeros, valor_numero, created_at")
        .eq("organizador_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Minhas rifas</h1>
          <Button asChild>
            <Link to="/criar-rifa">+ Nova rifa</Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Carregando…</p>
        ) : !data || data.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-card p-10 text-center">
            <p className="text-muted-foreground">Nenhuma rifa por enquanto.</p>
          </div>
        ) : (
          <ul className="mt-6 divide-y rounded-2xl border bg-card shadow-soft">
            {data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{r.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.quantidade_numeros} números · R$ {Number(r.valor_numero).toFixed(2)} · {r.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/r/$slug" params={{ slug: r.slug }}>Ver página</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
