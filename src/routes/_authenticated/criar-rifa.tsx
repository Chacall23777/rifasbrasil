import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { slugify, randomSuffix } from "@/lib/slug";

export const Route = createFileRoute("/_authenticated/criar-rifa")({
  component: CriarRifa,
  head: () => ({ meta: [{ title: "Criar rifa — RIFASBRASIL" }] }),
});

const schema = z.object({
  titulo: z.string().trim().min(3, "Título muito curto").max(120),
  descricao: z.string().max(2000).optional(),
  foto_principal: z.string().url("URL inválida").optional().or(z.literal("")),
  quantidade_numeros: z.number().int().min(2).max(100000),
  valor_numero: z.number().positive().max(100000),
  chave_pix: z.string().trim().min(5, "Informe sua chave PIX").max(120),
  data_encerramento: z.string().optional(),
  data_sorteio: z.string().optional(),
  regulamento: z.string().max(5000).optional(),
});

function CriarRifa() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    foto_principal: "",
    quantidade_numeros: 100,
    valor_numero: 5,
    chave_pix: "",
    data_encerramento: "",
    data_sorteio: "",
    regulamento: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);
    // gera slug único
    let slug = slugify(form.titulo) || "rifa";
    const { data: existing } = await supabase.from("rifas").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${randomSuffix()}`;

    const { data, error } = await supabase
      .from("rifas")
      .insert({
        organizador_id: user.id,
        slug,
        titulo: form.titulo,
        descricao: form.descricao || null,
        foto_principal: form.foto_principal || null,
        quantidade_numeros: form.quantidade_numeros,
        valor_numero: form.valor_numero,
        chave_pix: form.chave_pix,
        data_encerramento: form.data_encerramento || null,
        data_sorteio: form.data_sorteio || null,
        regulamento: form.regulamento || null,
      })
      .select("slug")
      .single();

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Rifa criada!");
    navigate({ to: "/r/$slug", params: { slug: data.slug } });
  }

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold">Criar nova rifa</h1>
        <p className="text-muted-foreground">Preencha os dados. Você poderá editar depois.</p>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
          <div>
            <Label>Nome da rifa *</Label>
            <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Rifa da PlayStation 5" />
          </div>
          <div>
            <Label>Foto principal (URL)</Label>
            <Input value={form.foto_principal} onChange={(e) => setForm({ ...form, foto_principal: e.target.value })} placeholder="https://..." />
            <p className="mt-1 text-xs text-muted-foreground">Cole o link de uma imagem pública.</p>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva o prêmio e a rifa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantidade de números *</Label>
              <Input type="number" min={2} max={100000} required value={form.quantidade_numeros} onChange={(e) => setForm({ ...form, quantidade_numeros: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Valor por número (R$) *</Label>
              <Input type="number" step="0.01" min={0.01} required value={form.valor_numero} onChange={(e) => setForm({ ...form, valor_numero: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Sua chave PIX *</Label>
            <Input required value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            <p className="mt-1 text-xs text-muted-foreground">O comprador paga direto para você.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Encerramento (opcional)</Label>
              <Input type="datetime-local" value={form.data_encerramento} onChange={(e) => setForm({ ...form, data_encerramento: e.target.value })} />
            </div>
            <div>
              <Label>Data do sorteio (opcional)</Label>
              <Input type="datetime-local" value={form.data_sorteio} onChange={(e) => setForm({ ...form, data_sorteio: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Regulamento (opcional)</Label>
            <Textarea rows={3} value={form.regulamento} onChange={(e) => setForm({ ...form, regulamento: e.target.value })} />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Publicando…" : "Publicar rifa"}
          </Button>
        </form>
      </div>
    </div>
  );
}
