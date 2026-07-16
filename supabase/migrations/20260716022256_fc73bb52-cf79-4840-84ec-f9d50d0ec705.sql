
-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  cidade TEXT,
  estado TEXT,
  foto_url TEXT,
  chave_pix TEXT,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_owner_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, foto_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- RIFAS
-- =========================
CREATE TABLE public.rifas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  foto_principal TEXT,
  galeria JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantidade_numeros INT NOT NULL CHECK (quantidade_numeros > 0 AND quantidade_numeros <= 100000),
  valor_numero NUMERIC(10,2) NOT NULL CHECK (valor_numero > 0),
  data_encerramento TIMESTAMPTZ,
  data_sorteio TIMESTAMPTZ,
  chave_pix TEXT NOT NULL,
  regulamento TEXT,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','encerrada','sorteada','cancelada')),
  numero_vencedor INT,
  nome_ganhador TEXT,
  visitas INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX rifas_organizador_idx ON public.rifas(organizador_id);
CREATE INDEX rifas_status_idx ON public.rifas(status);
CREATE INDEX rifas_created_idx ON public.rifas(created_at DESC);

GRANT SELECT ON public.rifas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rifas TO authenticated;
GRANT ALL ON public.rifas TO service_role;
ALTER TABLE public.rifas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rifas_public_read" ON public.rifas FOR SELECT USING (true);
CREATE POLICY "rifas_owner_insert" ON public.rifas FOR INSERT TO authenticated WITH CHECK (auth.uid() = organizador_id);
CREATE POLICY "rifas_owner_update" ON public.rifas FOR UPDATE TO authenticated USING (auth.uid() = organizador_id) WITH CHECK (auth.uid() = organizador_id);
CREATE POLICY "rifas_owner_delete" ON public.rifas FOR DELETE TO authenticated USING (auth.uid() = organizador_id);

-- =========================
-- RIFA NUMEROS
-- =========================
CREATE TABLE public.rifa_numeros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rifa_id UUID NOT NULL REFERENCES public.rifas(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  comprador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comprador_nome TEXT,
  comprador_email TEXT,
  comprador_telefone TEXT,
  status TEXT NOT NULL DEFAULT 'reservado' CHECK (status IN ('reservado','pago','cancelado')),
  comprovante_url TEXT,
  reservado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_em TIMESTAMPTZ,
  UNIQUE (rifa_id, numero)
);

CREATE INDEX rifa_numeros_rifa_idx ON public.rifa_numeros(rifa_id);
CREATE INDEX rifa_numeros_comprador_idx ON public.rifa_numeros(comprador_id);

GRANT SELECT ON public.rifa_numeros TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rifa_numeros TO authenticated;
GRANT ALL ON public.rifa_numeros TO service_role;
ALTER TABLE public.rifa_numeros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "numeros_public_read" ON public.rifa_numeros FOR SELECT USING (true);

CREATE POLICY "numeros_comprador_insert" ON public.rifa_numeros
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = comprador_id);

-- Comprador pode atualizar (para enviar comprovante) só enquanto está reservado
CREATE POLICY "numeros_comprador_update" ON public.rifa_numeros
  FOR UPDATE TO authenticated
  USING (auth.uid() = comprador_id AND status = 'reservado')
  WITH CHECK (auth.uid() = comprador_id);

-- Organizador da rifa pode atualizar/deletar qualquer número da sua rifa
CREATE POLICY "numeros_organizador_update" ON public.rifa_numeros
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rifas r WHERE r.id = rifa_id AND r.organizador_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rifas r WHERE r.id = rifa_id AND r.organizador_id = auth.uid()));

CREATE POLICY "numeros_organizador_delete" ON public.rifa_numeros
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rifas r WHERE r.id = rifa_id AND r.organizador_id = auth.uid()));

-- =========================
-- UPDATED_AT trigger
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_rifas_updated BEFORE UPDATE ON public.rifas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Incrementar visitas (RPC pública)
-- =========================
CREATE OR REPLACE FUNCTION public.incrementar_visita(rifa_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.rifas SET visitas = visitas + 1 WHERE slug = rifa_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.incrementar_visita(TEXT) TO anon, authenticated;
