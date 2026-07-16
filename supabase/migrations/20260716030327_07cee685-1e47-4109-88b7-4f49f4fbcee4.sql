
-- Slug redirects table: keeps old slugs working while there are no approved sales
CREATE TABLE public.rifa_slug_redirects (
  old_slug text PRIMARY KEY,
  rifa_id uuid NOT NULL REFERENCES public.rifas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rifa_slug_redirects TO anon, authenticated;
GRANT ALL ON public.rifa_slug_redirects TO service_role;

ALTER TABLE public.rifa_slug_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redirects_public_read" ON public.rifa_slug_redirects
  FOR SELECT USING (true);

-- Trigger on rifas: block slug change after first approved sale; record redirect otherwise
CREATE OR REPLACE FUNCTION public.rifas_guard_slug_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_approved boolean;
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    SELECT EXISTS (
      SELECT 1 FROM public.rifa_numeros
      WHERE rifa_id = OLD.id AND aprovado_em IS NOT NULL
    ) INTO has_approved;

    IF has_approved THEN
      RAISE EXCEPTION 'Não é possível alterar o link após a primeira venda aprovada.';
    END IF;

    INSERT INTO public.rifa_slug_redirects (old_slug, rifa_id)
    VALUES (OLD.slug, OLD.id)
    ON CONFLICT (old_slug) DO UPDATE SET rifa_id = EXCLUDED.rifa_id;

    -- Se o novo slug coincide com um redirect antigo, remove
    DELETE FROM public.rifa_slug_redirects WHERE old_slug = NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rifas_guard_slug ON public.rifas;
CREATE TRIGGER trg_rifas_guard_slug
BEFORE UPDATE ON public.rifas
FOR EACH ROW EXECUTE FUNCTION public.rifas_guard_slug_update();
