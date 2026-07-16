import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { gerarPixPayload } from "@/lib/pix";
import { Copy, Share2 } from "lucide-react";

export const Route = createFileRoute("/r/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("rifas")
      .select(
        "id, slug, titulo, descricao, foto_principal, quantidade_numeros, valor_numero, data_sorteio, data_encerramento, chave_pix, regulamento, status, organizador_id, visitas",
      )
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const { data: red } = await supabase
        .from("rifa_slug_redirects")
        .select("rifa_id, rifas!inner(slug)")
        .eq("old_slug", params.slug)
        .maybeSingle();
      const newSlug = (red as any)?.rifas?.slug;
      if (newSlug) throw redirect({ to: "/r/$slug", params: { slug: newSlug }, replace: true });
      throw notFound();
    }
    return { rifa: data };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.rifa.titulo} — RIFASBRASIL` },
          { name: "description", content: loaderData.rifa.descricao?.slice(0, 155) || "Participe desta rifa no RIFASBRASIL." },
          { property: "og:title", content: loaderData.rifa.titulo },
          { property: "og:description", content: loaderData.rifa.descricao?.slice(0, 155) || "Participe desta rifa no RIFASBRASIL." },
          ...(loaderData.rifa.foto_principal ? [{ property: "og:image", content: loaderData.rifa.foto_principal }] : []),
        ]
      : [{ title: "Rifa — RIFASBRASIL" }],
  }),
  component: RifaPage,
});

function RifaPage() {
  const { rifa } = Route.useLoaderData();
  const queryClient = useQueryClient();

  // Registra visita anonimamente (uma vez por sessão da página)
  useEffect(() => {
    supabase.from("rifa_visitas").insert({ rifa_id: rifa.id }).then(() => {});
  }, [rifa.id]);

  const { data: numeros } = useQuery({
    queryKey: ["rifa-numeros", rifa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rifa_numeros_public")
        .select("numero, status")
        .eq("rifa_id", rifa.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: organizador } = useQuery({
    queryKey: ["organizador", rifa.organizador_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("nome, cidade, estado")
        .eq("id", rifa.organizador_id)
        .maybeSingle();
      return data;
    },
  });

  const vendidos = numeros?.length ?? 0;
  const disponiveis = rifa.quantidade_numeros - vendidos;
  const percentual = Math.round((vendidos / rifa.quantidade_numeros) * 100);

  const [openReserva, setOpenReserva] = useState(false);
  const [selecionados, setSelecionados] = useState<number[]>([]);

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-lift">
          {rifa.foto_principal ? (
            <img src={rifa.foto_principal} alt={rifa.titulo} className="aspect-video w-full object-cover" />
          ) : (
            <div className="grid aspect-video place-items-center bg-muted text-6xl">🎟️</div>
          )}
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">{rifa.titulo}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Organizado por <strong>{organizador?.nome ?? "—"}</strong>
                  {organizador?.cidade && ` · ${organizador.cidade}/${organizador.estado}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">R$ {Number(rifa.valor_numero).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">por número</p>
              </div>
            </div>

            {rifa.descricao && <p className="mt-4 whitespace-pre-wrap text-sm">{rifa.descricao}</p>}

            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{vendidos} vendidos</span>
                <span>{disponiveis} disponíveis</span>
              </div>
              <Progress value={percentual} />
            </div>

            <ShareRow titulo={rifa.titulo} />

            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setOpenReserva(true)} disabled={rifa.status !== "ativa" || disponiveis === 0}>
                {disponiveis === 0 ? "Esgotada" : "Escolher meus números"}
              </Button>
            </div>

            {rifa.data_sorteio && (
              <p className="mt-4 text-sm text-muted-foreground">
                🎲 Sorteio: {new Date(rifa.data_sorteio).toLocaleString("pt-BR")}
              </p>
            )}
            {rifa.regulamento && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-primary">Regulamento</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{rifa.regulamento}</p>
              </details>
            )}
          </div>
        </div>

        <SelecionarNumeros
          rifa={rifa}
          numeros={(numeros ?? []).filter((n): n is { numero: number; status: string } => n.numero !== null && n.status !== null)}
          open={openReserva}
          onOpenChange={setOpenReserva}
          selecionados={selecionados}
          setSelecionados={setSelecionados}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["rifa-numeros", rifa.id] })}
        />
      </div>
    </div>
  );
}

function ShareRow({ titulo }: { titulo: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);
  const enc = encodeURIComponent(`${titulo} — ${url}`);
  const encUrl = encodeURIComponent(url);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encUrl}&text=${encodeURIComponent(titulo)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc}` },
  ];

  async function copiar() {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {links.map((l) => (
        <Button key={l.label} asChild size="sm" variant="outline">
          <a href={l.href} target="_blank" rel="noopener noreferrer">
            <Share2 className="mr-1 h-3.5 w-3.5" /> {l.label}
          </a>
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={copiar}>
        <Copy className="mr-1 h-3.5 w-3.5" /> Copiar link
      </Button>
    </div>
  );
}

function SelecionarNumeros({
  rifa,
  numeros,
  open,
  onOpenChange,
  selecionados,
  setSelecionados,
  onSuccess,
}: {
  rifa: any;
  numeros: { numero: number; status: string }[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selecionados: number[];
  setSelecionados: (n: number[]) => void;
  onSuccess: () => void;
}) {
  const ocupados = useMemo(() => new Set(numeros.map((n) => n.numero)), [numeros]);
  const [showPix, setShowPix] = useState(false);
  const [userChecked, setUserChecked] = useState<any>(null);
  const [pending, setPending] = useState(false);
  const [buyer, setBuyer] = useState({ nome: "", email: "", telefone: "" });

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(async ({ data }) => {
        setUserChecked(data.user);
        if (data.user) {
          const { data: p } = await supabase.rpc("get_my_profile");
          const row = Array.isArray(p) ? p[0] : p;
          if (row) setBuyer({ nome: row.nome ?? "", email: row.email ?? data.user.email ?? "", telefone: row.telefone ?? "" });
        }
      });
    }
  }, [open]);

  function toggle(n: number) {
    if (ocupados.has(n)) return;
    setSelecionados(selecionados.includes(n) ? selecionados.filter((x) => x !== n) : [...selecionados, n]);
  }

  function aleatorio(qtd: number) {
    const disponiveis: number[] = [];
    for (let i = 1; i <= rifa.quantidade_numeros; i++) if (!ocupados.has(i)) disponiveis.push(i);
    const escolhidos: number[] = [];
    for (let i = 0; i < qtd && disponiveis.length; i++) {
      const idx = Math.floor(Math.random() * disponiveis.length);
      escolhidos.push(disponiveis.splice(idx, 1)[0]);
    }
    setSelecionados(escolhidos);
  }

  async function reservar() {
    if (!userChecked) {
      toast.error("Faça login para participar");
      window.location.href = "/auth?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }
    if (selecionados.length === 0) return toast.error("Escolha ao menos um número");
    if (!buyer.nome || !buyer.telefone) return toast.error("Preencha nome e telefone");

    setPending(true);
    // Atualiza perfil com dados de contato
    await supabase.from("profiles").upsert({
      id: userChecked.id,
      nome: buyer.nome,
      email: buyer.email,
      telefone: buyer.telefone,
    });

    const rows = selecionados.map((numero) => ({
      rifa_id: rifa.id,
      numero,
      comprador_id: userChecked.id,
      comprador_nome: buyer.nome,
      comprador_email: buyer.email,
      comprador_telefone: buyer.telefone,
      status: "reservado",
    }));
    const { error } = await supabase.from("rifa_numeros").insert(rows);
    setPending(false);
    if (error) return toast.error("Alguém acabou de reservar. Escolha outros números.");
    toast.success("Números reservados! Agora efetue o PIX.");
    setShowPix(true);
    onSuccess();
  }

  const total = selecionados.length * Number(rifa.valor_numero);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{showPix ? "Pague com PIX" : "Escolha seus números"}</DialogTitle>
        </DialogHeader>

        {!showPix ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => aleatorio(1)}>+1 aleatório</Button>
              <Button size="sm" variant="secondary" onClick={() => aleatorio(5)}>+5 aleatórios</Button>
              <Button size="sm" variant="secondary" onClick={() => aleatorio(10)}>+10 aleatórios</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelecionados([])}>Limpar</Button>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border p-2">
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
                {Array.from({ length: rifa.quantidade_numeros }, (_, i) => i + 1).map((n) => {
                  const isOcup = ocupados.has(n);
                  const isSel = selecionados.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggle(n)}
                      disabled={isOcup}
                      className={[
                        "aspect-square rounded text-xs font-semibold transition",
                        isOcup
                          ? "cursor-not-allowed bg-muted text-muted-foreground line-through"
                          : isSel
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 hover:bg-secondary",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Seu nome *</Label>
                <Input value={buyer.nome} onChange={(e) => setBuyer({ ...buyer, nome: e.target.value })} />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input value={buyer.telefone} onChange={(e) => setBuyer({ ...buyer, telefone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>E-mail</Label>
                <Input type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-accent p-3 text-sm">
              <span>{selecionados.length} número(s)</span>
              <span className="font-bold text-primary">Total: R$ {total.toFixed(2)}</span>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={reservar} disabled={pending || selecionados.length === 0}>
                {pending ? "Reservando…" : "Reservar e pagar"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <PagamentoPix rifa={rifa} total={total} nomeComprador={buyer.nome} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PagamentoPix({ rifa, total, nomeComprador, onClose }: { rifa: any; total: number; nomeComprador: string; onClose: () => void }) {
  const [qr, setQr] = useState<string>("");
  const payload = useMemo(
    () =>
      gerarPixPayload({
        chave: rifa.chave_pix,
        valor: total,
        nomeRecebedor: nomeComprador || "RIFASBRASIL",
        descricao: `Rifa ${rifa.titulo}`.slice(0, 60),
      }),
    [rifa, total, nomeComprador],
  );

  useEffect(() => {
    QRCode.toDataURL(payload, { width: 260, margin: 1 }).then(setQr);
  }, [payload]);

  async function copiar() {
    await navigator.clipboard.writeText(payload);
    toast.success("Código PIX copiado!");
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        Escaneie o QR Code ou copie o código PIX. O pagamento vai <strong>direto para o organizador</strong>.
      </p>
      {qr ? <img src={qr} alt="QR Code PIX" className="mx-auto rounded border" /> : <div className="h-64" />}
      <p className="text-2xl font-black text-primary">R$ {total.toFixed(2)}</p>
      <Button onClick={copiar} variant="outline" className="w-full">
        <Copy className="mr-2 h-4 w-4" /> Copiar código PIX
      </Button>
      <p className="text-xs text-muted-foreground">
        Após o pagamento, envie o comprovante ao organizador via WhatsApp. Ele aprovará sua reserva.
      </p>
      <Button className="w-full" onClick={onClose}>Fechar</Button>
    </div>
  );
}
