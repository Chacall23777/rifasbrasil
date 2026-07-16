import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { gerarPixPayload } from "@/lib/pix";
import { Copy, Share2 } from "lucide-react";

export const Route = createFileRoute("/r/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("rifas_public")
      .select(
        "id, slug, titulo, descricao, foto_principal, quantidade_numeros, valor_numero, data_sorteio, data_encerramento, regulamento, status, organizador_id, visitas, numero_vencedor, nome_ganhador",
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
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Rifa — RIFASBRASIL" }] };
    const titulo = loaderData.rifa.titulo ?? "Rifa";
    const desc = loaderData.rifa.descricao?.slice(0, 155) || "Participe desta rifa no RIFASBRASIL.";
    const meta: { title?: string; name?: string; property?: string; content?: string }[] = [
      { title: `${titulo} — RIFASBRASIL` },
      { name: "description", content: desc },
      { property: "og:title", content: titulo },
      { property: "og:description", content: desc },
    ];
    if (loaderData.rifa.foto_principal) {
      meta.push({ property: "og:image", content: loaderData.rifa.foto_principal });
    }
    return { meta };
  },
  component: RifaPage,
});

function RifaPage() {
  const { rifa } = Route.useLoaderData();
  const queryClient = useQueryClient();

  // Registra visita anonimamente (uma vez por sessão da página)
  useEffect(() => {
    supabase
      .from("rifa_visitas")
      .insert({ rifa_id: rifa.id })
      .then(() => {});
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

  // Restaura carrinho salvo (mesma rifa) e retoma o fluxo após login
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rifa_pending");
      if (!raw) return;
      const pending = JSON.parse(raw) as { slug: string; numeros: number[]; autoOpen?: boolean };
      if (pending.slug !== rifa.slug) return;
      if (Array.isArray(pending.numeros) && pending.numeros.length) {
        setSelecionados(pending.numeros);
      }
      if (pending.autoOpen) {
        setOpenReserva(true);
      }
    } catch {}
  }, [rifa.slug]);

  // Persiste seleção do usuário na rifa atual
  useEffect(() => {
    try {
      if (selecionados.length === 0) {
        const raw = localStorage.getItem("rifa_pending");
        if (raw) {
          const p = JSON.parse(raw);
          if (p.slug === rifa.slug) localStorage.removeItem("rifa_pending");
        }
        return;
      }
      localStorage.setItem(
        "rifa_pending",
        JSON.stringify({ slug: rifa.slug, numeros: selecionados }),
      );
    } catch {}
  }, [selecionados, rifa.slug]);

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-lift">
          {rifa.foto_principal ? (
            <img
              src={rifa.foto_principal}
              alt={rifa.titulo}
              className="aspect-video w-full object-cover"
            />
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
                <p className="text-2xl font-black text-primary">
                  R$ {Number(rifa.valor_numero).toFixed(2)}
                </p>
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

            {rifa.status === "sorteada" && rifa.numero_vencedor != null && (
              <ResultadoSorteio
                titulo={rifa.titulo}
                numero={rifa.numero_vencedor}
                nome={rifa.nome_ganhador}
              />
            )}

            <ShareRow titulo={rifa.titulo} />

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => setOpenReserva(true)}
                disabled={rifa.status !== "ativa" || disponiveis === 0}
              >
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
                <summary className="cursor-pointer text-sm font-medium text-primary">
                  Regulamento
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {rifa.regulamento}
                </p>
              </details>
            )}
          </div>
        </div>

        <SelecionarNumeros
          rifa={rifa}
          numeros={(numeros ?? []).filter(
            (n): n is { numero: number; status: string } => n.numero !== null && n.status !== null,
          )}
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

function ResultadoSorteio({
  titulo,
  numero,
  nome,
}: {
  titulo: string;
  numero: number;
  nome: string | null;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);
  const texto = `🎉 Resultado da rifa "${titulo}": número ${String(numero).padStart(3, "0")}${nome ? ` — ${nome}` : ""}! Confira: ${url}`;

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    toast.success("Resultado copiado!");
  }

  return (
    <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">
        Resultado do sorteio
      </p>
      <p className="mt-1 text-xl font-black">Número {String(numero).padStart(3, "0")}</p>
      {nome && <p className="text-sm text-muted-foreground">Ganhador(a): {nome}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 className="mr-1 h-3.5 w-3.5" /> Compartilhar
          </a>
        </Button>
        <Button size="sm" variant="ghost" onClick={copiar}>
          <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
        </Button>
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
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encUrl}&text=${encodeURIComponent(titulo)}`,
    },
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
  const [reservedIds, setReservedIds] = useState<string[]>([]);
  const [chavePix, setChavePix] = useState<string>("");

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(async ({ data }) => {
        setUserChecked(data.user);
        if (data.user) {
          const { data: p } = await supabase.rpc("get_my_profile");
          const row = Array.isArray(p) ? p[0] : p;
          if (row)
            setBuyer({
              nome: row.nome ?? "",
              email: row.email ?? data.user.email ?? "",
              telefone: row.telefone ?? "",
            });
        }
      });
    }
  }, [open]);

  function toggle(n: number) {
    if (ocupados.has(n)) return;
    setSelecionados(
      selecionados.includes(n) ? selecionados.filter((x) => x !== n) : [...selecionados, n],
    );
  }

  function aleatorio(qtd: number) {
    // Soma `qtd` novos números aleatórios aos já selecionados (não substitui),
    // e nunca repete um número que já esteja ocupado ou já escolhido.
    const jaEscolhidos = new Set(selecionados);
    const disponiveis: number[] = [];
    for (let i = 1; i <= rifa.quantidade_numeros; i++) {
      if (!ocupados.has(i) && !jaEscolhidos.has(i)) disponiveis.push(i);
    }
    const novos: number[] = [];
    for (let i = 0; i < qtd && disponiveis.length; i++) {
      const idx = Math.floor(Math.random() * disponiveis.length);
      novos.push(disponiveis.splice(idx, 1)[0]);
    }
    setSelecionados([...selecionados, ...novos]);
  }

  async function reservar() {
    if (!userChecked) {
      // Salva rifa + números selecionados para retomar automaticamente após o login
      try {
        localStorage.setItem(
          "rifa_pending",
          JSON.stringify({ slug: rifa.slug, numeros: selecionados, autoOpen: true }),
        );
      } catch {}
      toast.message("Crie sua conta em 30s para participar");
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
    const { data: inserted, error } = await supabase.from("rifa_numeros").insert(rows).select("id");
    if (error) {
      setPending(false);
      return toast.error("Alguém acabou de reservar. Escolha outros números.");
    }
    // Fetch chave PIX (only accessible after reservation)
    const { data: chave } = await supabase.rpc("get_rifa_chave_pix", { _rifa_id: rifa.id });
    setChavePix((chave as string) || "");
    setReservedIds((inserted ?? []).map((r) => r.id));
    setPending(false);
    try {
      localStorage.removeItem("rifa_pending");
    } catch {}
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
              <Button size="sm" variant="secondary" onClick={() => aleatorio(1)}>
                +1 aleatório
              </Button>
              <Button size="sm" variant="secondary" onClick={() => aleatorio(5)}>
                +5 aleatórios
              </Button>
              <Button size="sm" variant="secondary" onClick={() => aleatorio(10)}>
                +10 aleatórios
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelecionados([])}>
                Limpar
              </Button>
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
                <Input
                  value={buyer.nome}
                  onChange={(e) => setBuyer({ ...buyer, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={buyer.telefone}
                  onChange={(e) => setBuyer({ ...buyer, telefone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={buyer.email}
                  onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-accent p-3 text-sm">
              <span>{selecionados.length} número(s)</span>
              <span className="font-bold text-primary">Total: R$ {total.toFixed(2)}</span>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={reservar} disabled={pending || selecionados.length === 0}>
                {pending ? "Reservando…" : "Reservar e pagar"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <PagamentoPix
            rifa={rifa}
            total={total}
            nomeComprador={buyer.nome}
            chavePix={chavePix}
            reservedIds={reservedIds}
            userId={userChecked?.id}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PagamentoPix({
  rifa,
  total,
  nomeComprador,
  chavePix,
  reservedIds,
  userId,
  onClose,
}: {
  rifa: any;
  total: number;
  nomeComprador: string;
  chavePix: string;
  reservedIds: string[];
  userId?: string;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const payload = useMemo(
    () =>
      chavePix
        ? gerarPixPayload({
            chave: chavePix,
            valor: total,
            nomeRecebedor: nomeComprador || "RIFASBRASIL",
            descricao: `Rifa ${rifa.titulo}`.slice(0, 60),
          })
        : "",
    [chavePix, total, nomeComprador, rifa.titulo],
  );

  useEffect(() => {
    if (payload) QRCode.toDataURL(payload, { width: 260, margin: 1 }).then(setQr);
  }, [payload]);

  async function copiar() {
    await navigator.clipboard.writeText(payload);
    toast.success("Código PIX copiado!");
  }

  async function copiarChave() {
    await navigator.clipboard.writeText(chavePix);
    toast.success("Chave PIX copiada!");
  }

  async function enviarComprovante(file: File) {
    if (!userId || reservedIds.length === 0) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Arquivo acima de 5 MB");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const stamp = Date.now();
    const path = `${rifa.id}/${userId}/${stamp}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("comprovantes")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setUploading(false);
      return toast.error("Falha ao enviar o comprovante");
    }
    const { error: updErr } = await supabase
      .from("rifa_numeros")
      .update({ comprovante_url: path })
      .in("id", reservedIds);
    setUploading(false);
    if (updErr) return toast.error("Falha ao registrar o comprovante");
    setSent(true);
    toast.success("Comprovante enviado! O organizador vai aprovar em breve.");
  }

  return (
    <div className="space-y-4 text-center">
      {!chavePix ? (
        <p className="text-sm text-muted-foreground">Carregando dados do pagamento…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Escaneie o QR Code ou copie o código PIX. O pagamento vai{" "}
            <strong>direto para o organizador</strong>.
          </p>
          {qr ? (
            <img src={qr} alt="QR Code PIX" className="mx-auto rounded border" />
          ) : (
            <div className="h-64" />
          )}
          <p className="text-2xl font-black text-primary">R$ {total.toFixed(2)}</p>

          <div className="rounded-lg border bg-muted/40 p-3 text-left text-xs">
            <p className="font-medium text-foreground">Chave PIX do organizador</p>
            <p className="mt-1 break-all text-muted-foreground">{chavePix}</p>
            <Button size="sm" variant="ghost" className="mt-1" onClick={copiarChave}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copiar chave
            </Button>
          </div>

          <Button onClick={copiar} variant="outline" className="w-full">
            <Copy className="mr-2 h-4 w-4" /> Copiar código PIX (copia e cola)
          </Button>

          <div className="rounded-lg border p-3 text-left">
            <p className="text-sm font-medium">Enviar comprovante</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Após pagar, envie a foto/PDF do comprovante. O organizador aprova sua reserva no
              painel dele.
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="mt-2 block w-full text-xs"
              disabled={uploading || sent}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarComprovante(f);
              }}
            />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Enviando…</p>}
            {sent && <p className="mt-1 text-xs text-emerald-600">Comprovante enviado ✔</p>}
          </div>
        </>
      )}
      <Button className="w-full" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );
}
    
   
    
