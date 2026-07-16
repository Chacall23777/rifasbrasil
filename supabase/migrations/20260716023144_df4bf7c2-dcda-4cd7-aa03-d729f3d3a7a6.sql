
-- Views with security_invoker=on so RLS of the caller applies.
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, nome, cidade, estado, foto_url, username
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP VIEW IF EXISTS public.rifa_numeros_public;
CREATE VIEW public.rifa_numeros_public
WITH (security_invoker = true) AS
SELECT id, rifa_id, numero, status, reservado_em, aprovado_em
FROM public.rifa_numeros;
GRANT SELECT ON public.rifa_numeros_public TO anon, authenticated;

-- Permit anon + authenticated to SELECT rows (needed by invoker-view),
-- but strip sensitive columns from those roles via column-level grants.
CREATE POLICY profiles_anon_read ON public.profiles
  FOR SELECT TO anon USING (true);
CREATE POLICY profiles_auth_read ON public.profiles
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, nome, cidade, estado, foto_url, username, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

CREATE POLICY numeros_anon_read ON public.rifa_numeros
  FOR SELECT TO anon USING (true);
CREATE POLICY numeros_auth_read ON public.rifa_numeros
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.rifa_numeros FROM anon, authenticated;
GRANT SELECT (id, rifa_id, numero, status, reservado_em, aprovado_em, comprador_id)
  ON public.rifa_numeros TO anon, authenticated;

-- Owner-scoped full reads via SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_meus_numeros()
RETURNS SETOF public.rifa_numeros
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.rifa_numeros WHERE comprador_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_meus_numeros() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_numeros_da_rifa(_rifa_id uuid)
RETURNS SETOF public.rifa_numeros
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.* FROM public.rifa_numeros n
  JOIN public.rifas r ON r.id = n.rifa_id
  WHERE n.rifa_id = _rifa_id AND r.organizador_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_numeros_da_rifa(uuid) TO authenticated;
