
-- ===========================================================
-- 1) Public view for rifas WITHOUT chave_pix
-- ===========================================================
CREATE OR REPLACE VIEW public.rifas_public
WITH (security_invoker = on) AS
SELECT
  id, slug, titulo, descricao, foto_principal,
  quantidade_numeros, valor_numero,
  data_sorteio, data_encerramento,
  regulamento, status, organizador_id, visitas,
  created_at
FROM public.rifas;

GRANT SELECT ON public.rifas_public TO anon, authenticated;

-- Revoke direct SELECT on chave_pix from anon/authenticated (organizer still reads via base table policy)
REVOKE SELECT (chave_pix) ON public.rifas FROM anon, authenticated;

-- ===========================================================
-- 2) Secure function to read chave_pix
--    Allowed if caller is organizer OR has any reservation on that rifa
-- ===========================================================
CREATE OR REPLACE FUNCTION public.get_rifa_chave_pix(_rifa_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chave text;
  v_allowed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.rifas r
    WHERE r.id = _rifa_id AND r.organizador_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.rifa_numeros n
    WHERE n.rifa_id = _rifa_id AND n.comprador_id = auth.uid()
  ) INTO v_allowed;

  IF NOT v_allowed THEN RETURN NULL; END IF;

  SELECT chave_pix INTO v_chave FROM public.rifas WHERE id = _rifa_id;
  RETURN v_chave;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rifa_chave_pix(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rifa_chave_pix(uuid) TO authenticated;

-- ===========================================================
-- 3) Storage RLS for `comprovantes` bucket
--    Path convention: {rifa_id}/{comprador_id}/{numero_id}.{ext}
-- ===========================================================

-- Buyer uploads their own comprovante
CREATE POLICY "comprovantes_buyer_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Buyer reads their own
CREATE POLICY "comprovantes_buyer_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Buyer replaces their own
CREATE POLICY "comprovantes_buyer_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'comprovantes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Organizer of the rifa reads comprovantes recebidos
CREATE POLICY "comprovantes_organizador_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND EXISTS (
    SELECT 1 FROM public.rifas r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.organizador_id = auth.uid()
  )
);

-- ===========================================================
-- 4) Signed URL helper for the organizer to view comprovante
--    (Kept simple; frontend calls createSignedUrl using service role isn't safe.
--     Instead, organizer uses supabase.storage.from().createSignedUrl which
--     requires SELECT permission — the policy above grants it.)
-- ===========================================================
