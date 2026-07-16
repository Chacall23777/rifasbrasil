import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/rifas-participadas")({
  component: RifasParticipadas,
  head: () => ({ meta: [{ title: "Rifas participadas — RIFASBRASIL" }] }),
});

function RifasParticipadas() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["rifas-participadas", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rifa_numeros")
        .select("numero, status, reservado_em, rifa:rifas(id, slug, titulo, valor_numero)")
        .eq("comprador_id", user.id)
        .order("reservado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold">Rifas participadas</h1>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Carregando…</p>
        ) : !data || data.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-card p-10 text-center">
            <p className="text-muted-foreground">Você ainda não participou de nenhuma rifa.</p>
          </div>
        ) : (
          <ul className="mt-6 divide-y rounded-2xl border bg-card shadow-soft">
            {data.map((r: any, i: number) => (
              <li key={i} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{r.rifa?.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    Número {r.numero} · {r.status} · {new Date(r.reservado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {r.rifa?.slug && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/r/$slug" params={{ slug: r.rifa.slug }}>Ver rifa</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
