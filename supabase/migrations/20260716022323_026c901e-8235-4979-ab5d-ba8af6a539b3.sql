
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public execute from SECURITY DEFINER trigger fn (trigger still fires)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Drop the public RPC in favor of a plain table
DROP FUNCTION IF EXISTS public.incrementar_visita(TEXT);

CREATE TABLE public.rifa_visitas (
  id BIGSERIAL PRIMARY KEY,
  rifa_id UUID NOT NULL REFERENCES public.rifas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX rifa_visitas_rifa_idx ON public.rifa_visitas(rifa_id);

GRANT SELECT, INSERT ON public.rifa_visitas TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rifa_visitas_id_seq TO anon, authenticated;
GRANT ALL ON public.rifa_visitas TO service_role;
GRANT ALL ON SEQUENCE public.rifa_visitas_id_seq TO service_role;
ALTER TABLE public.rifa_visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitas_public_insert" ON public.rifa_visitas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "visitas_public_read" ON public.rifa_visitas FOR SELECT USING (true);
