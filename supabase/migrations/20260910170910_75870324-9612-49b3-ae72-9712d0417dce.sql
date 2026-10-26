-- 1. Catálogo de tipos de exame
CREATE TABLE public.tipos_exame (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text,
  valor_padrao numeric(12,2) NOT NULL DEFAULT 0,
  periodicidade_meses integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_exame TO authenticated;
GRANT ALL ON public.tipos_exame TO service_role;
ALTER TABLE public.tipos_exame ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all tipos_exame" ON public.tipos_exame FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tg_tipos_exame_updated BEFORE UPDATE ON public.tipos_exame FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE UNIQUE INDEX tipos_exame_nome_uidx ON public.tipos_exame (lower(nome));

-- 2. Exames (vínculo paciente x exame) ganha catálogo, valor histórico e próxima data
ALTER TABLE public.exames
  ADD COLUMN IF NOT EXISTS tipo_exame_id uuid REFERENCES public.tipos_exame(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor numeric(12,2),
  ADD COLUMN IF NOT EXISTS periodicidade_meses integer,
  ADD COLUMN IF NOT EXISTS proxima_data date;

CREATE INDEX IF NOT EXISTS exames_trabalhador_idx ON public.exames (trabalhador_id);
CREATE INDEX IF NOT EXISTS exames_empresa_idx ON public.exames (empresa_id);
CREATE INDEX IF NOT EXISTS exames_tipo_exame_idx ON public.exames (tipo_exame_id);
CREATE INDEX IF NOT EXISTS exames_proxima_data_idx ON public.exames (proxima_data);

-- 3. Plano de Ações
CREATE TABLE public.planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo_acao text NOT NULL DEFAULT 'Treinamento',
  descricao text,
  trabalhador_id uuid REFERENCES public.trabalhadores(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  data_abertura date NOT NULL DEFAULT current_date,
  data_prevista date,
  data_conclusao date,
  status text NOT NULL DEFAULT 'pendente',
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_acao TO authenticated;
GRANT ALL ON public.planos_acao TO service_role;
ALTER TABLE public.planos_acao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all planos_acao" ON public.planos_acao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tg_planos_acao_updated BEFORE UPDATE ON public.planos_acao FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX planos_acao_trabalhador_idx ON public.planos_acao (trabalhador_id);
CREATE INDEX planos_acao_empresa_idx ON public.planos_acao (empresa_id);
CREATE INDEX planos_acao_status_idx ON public.planos_acao (status);
CREATE INDEX planos_acao_data_prevista_idx ON public.planos_acao (data_prevista);

-- 4. Catálogo inicial de exames mais usados
INSERT INTO public.tipos_exame (nome, categoria, valor_padrao, periodicidade_meses, descricao) VALUES
  ('Clínico Ocupacional', 'Clínico', 0, 12, 'Consulta clínica ocupacional para emissão de ASO'),
  ('Acuidade Visual', 'Complementar', 0, 12, 'Avaliação da acuidade visual'),
  ('Dinamometria', 'Complementar', 0, 12, 'Avaliação de força de preensão'),
  ('Audiometria', 'Complementar', 0, 12, 'Avaliação audiológica ocupacional'),
  ('Espirometria', 'Complementar', 0, 12, 'Avaliação da função pulmonar'),
  ('Eletrocardiograma', 'Complementar', 0, 12, 'ECG em repouso'),
  ('Hemograma Completo', 'Laboratorial', 0, 12, 'Exame laboratorial de sangue');