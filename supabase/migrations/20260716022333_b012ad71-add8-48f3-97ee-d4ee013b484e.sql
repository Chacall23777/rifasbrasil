
DROP POLICY IF EXISTS "visitas_public_insert" ON public.rifa_visitas;
CREATE POLICY "visitas_public_insert" ON public.rifa_visitas
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rifas r WHERE r.id = rifa_id));
