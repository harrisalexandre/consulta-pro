DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c
  FROM pg_constraint
  WHERE conrelid='public.whatsapp_integrations'::regclass
    AND contype='c'
    AND pg_get_constraintdef(oid) LIKE '%provider%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.whatsapp_integrations DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE public.whatsapp_integrations
  ADD CONSTRAINT whatsapp_integrations_provider_check CHECK (provider = 'evolution');
