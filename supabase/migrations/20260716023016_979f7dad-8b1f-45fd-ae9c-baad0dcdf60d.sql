
-- Restrict base tables and expose public-safe views

-- PROFILES
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

CREATE POLICY profiles_owner_select ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT id, nome, cidade, estado, foto_url
FROM public.profiles;

REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- RIFA_NUMEROS
DROP POLICY IF EXISTS numeros_public_read ON public.rifa_numeros;

CREATE POLICY numeros_comprador_select ON public.rifa_numeros
  FOR SELECT TO authenticated
  USING (auth.uid() = comprador_id);

CREATE POLICY numeros_organizador_select ON public.rifa_numeros
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rifas r
    WHERE r.id = rifa_numeros.rifa_id AND r.organizador_id = auth.uid()
  ));

CREATE OR REPLACE VIEW public.rifa_numeros_public
WITH (security_invoker = false) AS
SELECT id, rifa_id, numero, status, reservado_em
FROM public.rifa_numeros;

REVOKE ALL ON public.rifa_numeros_public FROM PUBLIC;
GRANT SELECT ON public.rifa_numeros_public TO anon, authenticated;
