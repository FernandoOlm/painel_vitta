CREATE TABLE public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text,
  mensagem text NOT NULL,
  media_url text,
  destinatarios text[] NOT NULL DEFAULT '{}',
  total_destinatarios integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'enviada',
  resposta text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas TO authenticated;
GRANT ALL ON public.campanhas TO service_role;

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all campanhas" ON public.campanhas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER tg_campanhas_updated BEFORE UPDATE ON public.campanhas
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();