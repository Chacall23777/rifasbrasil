
CREATE OR REPLACE FUNCTION public.rifa_numeros_guard_buyer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_organizer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.rifas r
    WHERE r.id = NEW.rifa_id AND r.organizador_id = auth.uid()
  ) INTO is_organizer;

  IF is_organizer THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.comprador_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.aprovado_em IS DISTINCT FROM OLD.aprovado_em
       OR NEW.numero IS DISTINCT FROM OLD.numero
       OR NEW.rifa_id IS DISTINCT FROM OLD.rifa_id
       OR NEW.comprador_id IS DISTINCT FROM OLD.comprador_id
       OR NEW.comprador_nome IS DISTINCT FROM OLD.comprador_nome
       OR NEW.comprador_email IS DISTINCT FROM OLD.comprador_email
       OR NEW.comprador_telefone IS DISTINCT FROM OLD.comprador_telefone
       OR NEW.reservado_em IS DISTINCT FROM OLD.reservado_em THEN
      RAISE EXCEPTION 'Buyers can only update the payment receipt (comprovante_url).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rifa_numeros_guard_buyer_update ON public.rifa_numeros;
CREATE TRIGGER rifa_numeros_guard_buyer_update
  BEFORE UPDATE ON public.rifa_numeros
  FOR EACH ROW EXECUTE FUNCTION public.rifa_numeros_guard_buyer_update();

-- Also tighten the buyer UPDATE policy WITH CHECK so status stays 'reservado'.
DROP POLICY IF EXISTS numeros_comprador_update ON public.rifa_numeros;
CREATE POLICY numeros_comprador_update ON public.rifa_numeros
  FOR UPDATE TO authenticated
  USING (auth.uid() = comprador_id AND status = 'reservado')
  WITH CHECK (auth.uid() = comprador_id AND status = 'reservado');
