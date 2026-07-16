import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { Check, X, Loader2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/minhas-rifas")({
  component: MinhasRifas,
  head: () => ({ meta: [{ title: "Minhas rifas — RIFASBRASIL" }] }),
});

type Rifa = {
  id: string;
  titulo: string;
  slug: string;
  status: string;
  quantidade_numeros: number;
  valor_numero: number;
  created_at: string;
};

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
      return data as Rifa[];
    },
  });

  const [editing, setEditing] = useState<Rifa | null>(null);

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
                <div className="min-w-0">
                  <p className="font-medium">{r.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /r/{r.slug} · {r.quantidade_numeros} números · R$ {Number(r.valor_numero).toFixed(2)} · {r.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar link
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/r/$slug" params={{ slug: r.slug }}>Ver página</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditarSlugDialog rifa={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditarSlugDialog({ rifa, onClose }: { rifa: Rifa | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<null | boolean>(null);
  const [locked, setLocked] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rifa) return;
    setValue(rifa.slug);
    setAvailable(null);
    // Verifica se já há vendas aprovadas (bloqueia edição)
    supabase
      .from("rifa_numeros")
      .select("id", { count: "exact", head: true })
      .eq("rifa_id", rifa.id)
      .not("aprovado_em", "is", null)
      .then(({ count }) => setLocked((count ?? 0) > 0));
  }, [rifa]);

  useEffect(() => {
    if (!rifa) return;
    const s = slugify(value);
    if (!s || s === rifa.slug) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const [{ data: r1 }, { data: r2 }] = await Promise.all([
        supabase.from("rifas").select("id").eq("slug", s).maybeSingle(),
        supabase.from("rifa_slug_redirects").select("old_slug").eq("old_slug", s).maybeSingle(),
      ]);
      setAvailable(!r1 && !r2);
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [value, rifa]);

  async function salvar() {
    if (!rifa) return;
    const s = slugify(value);
    if (!s) return toast.error("Link inválido");
    if (s === rifa.slug) return onClose();
    if (available === false) return toast.error("Este link já está em uso");
    setSaving(true);
    const { error } = await supabase.from("rifas").update({ slug: s }).eq("id", rifa.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Link atualizado! O antigo redireciona automaticamente.");
    qc.invalidateQueries({ queryKey: ["minhas-rifas"] });
    onClose();
  }

  const s = slugify(value);

  return (
    <Dialog open={!!rifa} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar link da rifa</DialogTitle>
        </DialogHeader>

        {locked ? (
          <p className="text-sm text-muted-foreground">
            Este link não pode mais ser alterado porque a rifa já tem vendas aprovadas.
            Manter o link estável evita que compradores percam o acesso à página.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Novo link personalizado</Label>
              <div className="mt-1 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">rifasbrasil.com/r/</span>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="flex-1 bg-transparent outline-none"
                  placeholder="iphone16pro"
                  maxLength={60}
                />
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : available === true ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : available === false ? (
                  <X className="h-4 w-4 text-destructive" />
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ficará como: <strong>/r/{s || "…"}</strong>
              </p>
              {available === false && (
                <p className="mt-1 text-xs text-destructive">Este link já está em uso.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              O link antigo continuará funcionando via redirecionamento — até a primeira venda aprovada.
              Depois disso, o link fica travado.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          {!locked && (
            <Button onClick={salvar} disabled={saving || checking || available === false || !s}>
              {saving ? "Salvando…" : "Salvar link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
