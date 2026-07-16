
-- Revert view to security_invoker to satisfy linter
DROP VIEW IF EXISTS public.rifas_public;
CREATE VIEW public.rifas_public WITH (security_invoker=on) AS
  SELECT id, slug, titulo, descricao, foto_principal, galeria, quantidade_numeros,
         valor_numero, data_sorteio, data_encerramento, regulamento, status,
         numero_vencedor, nome_ganhador, organizador_id, visitas, created_at, updated_at
  FROM public.rifas;
GRANT SELECT ON public.rifas_public TO anon, authenticated;

-- Restore public read policy on rifas (owner-only policy no longer needed)
DROP POLICY IF EXISTS rifas_owner_select ON public.rifas;
CREATE POLICY rifas_public_read ON public.rifas FOR SELECT USING (true);

-- Column-level GRANT revocation: hide chave_pix from anon/authenticated
REVOKE SELECT ON public.rifas FROM anon, authenticated;
GRANT SELECT (id, organizador_id, slug, titulo, descricao, foto_principal, galeria,
              quantidade_numeros, valor_numero, data_encerramento, data_sorteio,
              regulamento, status, numero_vencedor, nome_ganhador, visitas,
              created_at, updated_at)
  ON public.rifas TO anon, authenticated;
-- Organizer needs full write access; keep INSERT/UPDATE/DELETE grants as before
GRANT INSERT, UPDATE, DELETE ON public.rifas TO authenticated;
