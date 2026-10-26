ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS vidas integer,
  ADD COLUMN IF NOT EXISTS grau_risco integer,
  ADD COLUMN IF NOT EXISTS data_entrada date,
  ADD COLUMN IF NOT EXISTS mes_renovacao text,
  ADD COLUMN IF NOT EXISTS tem_contrato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dia_faturamento integer,
  ADD COLUMN IF NOT EXISTS venc_art date,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Ativo',
  ADD COLUMN IF NOT EXISTS resp_rh text,
  ADD COLUMN IF NOT EXISTS rh_telefone text,
  ADD COLUMN IF NOT EXISTS rh_email text,
  ADD COLUMN IF NOT EXISTS contabilidade text,
  ADD COLUMN IF NOT EXISTS resp_contador text,
  ADD COLUMN IF NOT EXISTS contador_telefone text,
  ADD COLUMN IF NOT EXISTS contador_email text;

ALTER TABLE public.trabalhadores
  ADD COLUMN IF NOT EXISTS registro text NOT NULL DEFAULT 'Ativo',
  ADD COLUMN IF NOT EXISTS cbo text,
  ADD COLUMN IF NOT EXISTS ultimo_exame_data date,
  ADD COLUMN IF NOT EXISTS ultimo_exame_tipo text,
  ADD COLUMN IF NOT EXISTS proximo_exame_data date,
  ADD COLUMN IF NOT EXISTS status_exame text NOT NULL DEFAULT 'Em dia';

CREATE TABLE IF NOT EXISTS public.exames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalhador_id uuid REFERENCES public.trabalhadores(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  registro text,
  tipo text NOT NULL DEFAULT 'Periódico',
  status text NOT NULL DEFAULT 'Em dia',
  clinica text,
  data date,
  horario text,
  esocial text,
  fatura numeric(12,2),
  lucro numeric(12,2),
  custo numeric(12,2),
  valor_clinica numeric(12,2),
  valor_laboratorio numeric(12,2),
  kit text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exames TO authenticated;
GRANT ALL ON public.exames TO service_role;
ALTER TABLE public.exames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all exames" ON public.exames FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER exames_set_updated_at BEFORE UPDATE ON public.exames
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_exames_trabalhador ON public.exames(trabalhador_id);
CREATE INDEX IF NOT EXISTS idx_exames_data ON public.exames(data);