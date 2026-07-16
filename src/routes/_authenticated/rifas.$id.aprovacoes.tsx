import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, FileText, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rifas/$id/aprovacoes")({
  component: Aprovacoes,
  head: () => ({ meta: [{ title: "Aprovar pagamentos — RIFASBRASIL" }] }),
});

type Item = {
  id: string;
  numero: number;
  status: string;
  comprador_nome: string | null;
  comprador_email: string | null;
  comprador_telefone: string | null;
  comprovante_url: string | null;
  reservado_em: string | null;
  aprovado_em: string | null;
};

function Aprovacoes() {
  const { id: rifaId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"reservado" | "aprovado" | "rejeitado" | "todos">("reservado");

  const { data: rifa } = useQuery({
    queryKey: ["rifa-owner", rifaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rifas")
        .select("id, titulo, slug, organizador_id, quantidade_numeros, valor_numero")
        .eq("id", rifaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isOwner = rifa && rifa.organizador_id === user.id;

  const { data: itens } = useQuery({
    queryKey: ["numeros-owner", rifaId],
    enabled: !!isOwner,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_numeros_da_rifa", { _rifa_id: rifaId });
      if (error) throw error;
      return (data as Item[]).sort((a, b) => a.numero - b.numero);
    },
  });

  const filtered = useMemo(() => {
    if (!itens) return [];
    if (filter === "todos") return itens;
    return itens.filter((i) => (i.status || "").toLowerCase() === filter);
  }, [itens, filter]);

  const contagem = useMemo(() => {
    const c = { reservado: 0, aprovado: 0, rejeitado: 0 };
    (itens || []).forEach((i) => {
      const s = (i.status || "").toLowerCase();
      if (s in c) (c as any)[s]++;
    });
    return c;
  }, [itens]);

  async function aprovar(item: Item) {
    const { error } = await supabase
      .from("rifa_numeros")
      .update({ status: "aprovado", aprovado_em: new Date().toISOString() })
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success(`Número ${item.numero} aprovado`);
    qc.invalidateQueries({ queryKey: ["numeros-owner", rifaId] });
  }

  async function rejeitar(item: Item) {
    const { error } = await supabase
      .from("rifa_numeros")
      .delete()
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success(`Número ${item.numero} liberado`);
    qc.invalidateQueries({ queryKey: ["numeros-owner", rifaId] });
  }

  async function abrirComprovante(path: string) {
    const { data, error } = await supabase.storage
      .from("comprovantes")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o comprovante");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  if (rifa === null) {
    return (
      <div className="min-h-screen bg-accent/20">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">Rifa não encontrada.</div>
      </div>
    );
  }

  if (rifa && !isOwner) {
    return (
      <div className="min-h-screen bg-accent/20">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">Você não é o organizador desta rifa.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/minhas-rifas" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Minhas rifas
        </Link>
        <h1 className="text-2xl font-bold md:text-3xl">Aprovações</h1>
        {rifa && <p className="text-sm text-muted-foreground">{rifa.titulo}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              { k: "reservado", label: `Pendentes (${contagem.reservado})` },
              { k: "aprovado", label: `Aprovados (${contagem.aprovado})` },
              { k: "rejeitado", label: `Rejeitados (${contagem.rejeitado})` },
              { k: "todos", label: "Todos" },
            ] as const
          ).map((t) => (
            <Button
              key={t.k}
              size="sm"
              variant={filter === t.k ? "default" : "outline"}
              onClick={() => setFilter(t.k)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {!itens ? (
          <p className="mt-8 text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
            Nada por aqui.
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {filtered.map((i) => {
              const status = (i.status || "").toLowerCase();
              return (
                <li key={i.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                          Nº {String(i.numero).padStart(3, "0")}
                        </span>
                        <Badge variant={status === "aprovado" ? "default" : "secondary"}>
                          {status || "reservado"}
                        </Badge>
                      </div>
                      <p className="mt-2 font-medium">{i.comprador_nome ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.comprador_telefone ?? "—"}
                        {i.comprador_email ? ` · ${i.comprador_email}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reservado em {i.reservado_em ? new Date(i.reservado_em).toLocaleString("pt-BR") : "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {i.comprovante_url && (
                        <Button size="sm" variant="outline" onClick={() => abrirComprovante(i.comprovante_url!)}>
                          <FileText className="mr-1 h-3.5 w-3.5" /> Comprovante
                        </Button>
                      )}
                      {status !== "aprovado" && (
                        <Button size="sm" onClick={() => aprovar(i)}>
                          <Check className="mr-1 h-3.5 w-3.5" /> Aprovar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => rejeitar(i)}>
                        <X className="mr-1 h-3.5 w-3.5" /> Liberar
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
