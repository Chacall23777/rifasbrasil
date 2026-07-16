
-- Recreate rifas_public as definer view (no chave_pix) and add updated_at
DROP VIEW IF EXISTS public.rifas_public;
CREATE VIEW public.rifas_public AS
  SELECT id, slug, titulo, descricao, foto_principal, quantidade_numeros,
         valor_numero, data_sorteio, data_encerramento, regulamento, status,
         organizador_id, visitas, created_at, updated_at
  FROM public.rifas;
GRANT SELECT ON public.rifas_public TO anon, authenticated;

-- Remove public SELECT on rifas base table; restrict to organizer
DROP POLICY IF EXISTS rifas_public_read ON public.rifas;
CREATE POLICY rifas_owner_select ON public.rifas
  FOR SELECT USING (auth.uid() = organizador_id);

-- Restrict rifa_visitas SELECT to the raffle organizer
DROP POLICY IF EXISTS visitas_public_read ON public.rifa_visitas;
CREATE POLICY visitas_organizer_read ON public.rifa_visitas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rifas r
      WHERE r.id = rifa_visitas.rifa_id AND r.organizador_id = auth.uid()
    )
  );
