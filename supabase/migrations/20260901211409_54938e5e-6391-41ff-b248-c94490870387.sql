CREATE TABLE IF NOT EXISTS public.campanha_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  target text NOT NULL,
  status text NOT NULL CHECK (status IN ('sucesso','erro')),
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanha_logs_campanha ON public.campanha_logs(campanha_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_campanha_logs_target ON public.campanha_logs(campanha_id, target);

GRANT SELECT ON public.campanha_logs TO authenticated;
GRANT ALL ON public.campanha_logs TO service_role;

ALTER TABLE public.campanha_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados podem ver logs de campanha" ON public.campanha_logs;
CREATE POLICY "Autenticados podem ver logs de campanha"
ON public.campanha_logs FOR SELECT TO authenticated USING (true);

ALTER TABLE public.campanha_logs REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'campanha_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campanha_logs;
  END IF;
END $$;

ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS enviados int NOT NULL DEFAULT 0;
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS erros int NOT NULL DEFAULT 0;
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS finalizada_em timestamptz;

ALTER TABLE public.campanhas REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'campanhas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campanhas;
  END IF;
END $$;