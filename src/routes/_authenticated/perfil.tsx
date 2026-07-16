import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Perfil,
  head: () => ({ meta: [{ title: "Meu perfil — RIFASBRASIL" }] }),
});

function Perfil() {
  const { user } = Route.useRouteContext();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: user.email ?? "",
    telefone: "",
    cidade: "",
    estado: "",
    chave_pix: "",
    foto_url: "",
  });

  useEffect(() => {
    supabase
      .from("profiles")
      .select("nome, email, telefone, cidade, estado, chave_pix, foto_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setForm((f) => ({ ...f, ...data, email: data.email ?? f.email }) as any);
      });
  }, [user.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form, estado: form.estado.toUpperCase() });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
  }

  return (
    <div className="min-h-screen bg-accent/20">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold">Meu perfil</h1>
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-soft">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email ?? ""} disabled />
          </div>
          <div>
            <Label>Telefone (WhatsApp)</Label>
            <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Cidade</Label>
              <Input value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
            </div>
            <div>
              <Label>UF</Label>
              <Input maxLength={2} value={form.estado ?? ""} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div>
            <Label>Chave PIX padrão</Label>
            <Input value={form.chave_pix ?? ""} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          </div>
          <div>
            <Label>URL da foto</Label>
            <Input value={form.foto_url ?? ""} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} placeholder="https://..." />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
        </form>
      </div>
    </div>
  );
}
