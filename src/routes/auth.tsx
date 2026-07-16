import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Ticket } from "lucide-react";

const authSearch = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: authSearch,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar — RIFASBRASIL" },
      { name: "description", content: "Entre ou crie sua conta grátis no RIFASBRASIL." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const target = redirect || "/dashboard";

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("Falha ao entrar com Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: target });
  }

  return (
    <div className="min-h-screen bg-accent/30">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-bold text-xl">
          <span className="grid h-9 w-9 place-items-center rounded-lg gradient-brand text-white">
            <Ticket className="h-4 w-4" />
          </span>
          RIFAS<span className="text-primary">BRASIL</span>
        </Link>

        <div className="rounded-2xl border bg-card p-6 shadow-lift">
          <Tabs defaultValue="entrar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="cadastrar">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar" className="pt-4">
              <LoginForm onDone={() => navigate({ to: target })} />
            </TabsContent>
            <TabsContent value="cadastrar" className="pt-4">
              <SignupForm onDone={() => navigate({ to: target })} />
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            <GoogleIcon /> Continuar com Google
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com os termos de uso.
        </p>
      </div>
    </div>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(form);
    setLoading(false);
    if (error) return toast.error(error.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="e-email">E-mail</Label>
        <Input id="e-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="e-pass">Senha</Label>
        <Input id="e-pass" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

const signupSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido"),
  telefone: z.string().trim().min(8, "Telefone inválido").max(20),
  cidade: z.string().trim().min(2, "Informe sua cidade").max(60),
  estado: z.string().trim().length(2, "UF (2 letras)"),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function SignupForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cidade: "", estado: "", password: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { nome: form.nome },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Preenche o perfil se sessão já ativa
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        cidade: form.cidade,
        estado: form.estado.toUpperCase(),
      });
    }
    setLoading(false);
    toast.success("Conta criada! Se pedirmos confirmação por e-mail, verifique sua caixa de entrada.");
    if (data.session) onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label>Nome completo</Label>
        <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      </div>
      <div>
        <Label>E-mail</Label>
        <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <Label>Telefone (WhatsApp)</Label>
        <Input required value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Cidade</Label>
          <Input required value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
        </div>
        <div>
          <Label>UF</Label>
          <Input required maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <div>
        <Label>Senha</Label>
        <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando…" : "Criar conta grátis"}
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
