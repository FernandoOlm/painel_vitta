
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'dev', 'user');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_dev(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','dev'))
$$;

CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin_or_dev(auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- Default role: user
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ COMERCIAL ============
CREATE TYPE public.contato_tipo AS ENUM ('cliente', 'nao_cliente');

CREATE TABLE public.contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tipo contato_tipo NOT NULL DEFAULT 'nao_cliente',
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos TO authenticated;
GRANT ALL ON public.contatos TO service_role;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all contatos" ON public.contatos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tg_contatos_updated BEFORE UPDATE ON public.contatos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ EMPRESAS ============
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  razao_social TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  contato_responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all empresas" ON public.empresas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tg_empresas_updated BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ TRABALHADORES ============
CREATE TABLE public.trabalhadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  data_nascimento DATE,
  funcao TEXT,
  setor TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  data_admissao DATE,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trabalhadores TO authenticated;
GRANT ALL ON public.trabalhadores TO service_role;
ALTER TABLE public.trabalhadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all trabalhadores" ON public.trabalhadores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tg_trabalhadores_updated BEFORE UPDATE ON public.trabalhadores FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_trabalhadores_empresa ON public.trabalhadores(empresa_id);

-- Ações vinculadas (treinamentos/exames)
CREATE TYPE public.acao_tipo AS ENUM ('treinamento', 'exame', 'aso', 'outro');

CREATE TABLE public.acoes_trabalhador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalhador_id UUID NOT NULL REFERENCES public.trabalhadores(id) ON DELETE CASCADE,
  tipo acao_tipo NOT NULL,
  descricao TEXT NOT NULL,
  data_realizacao DATE,
  data_vencimento DATE,
  observacoes TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acoes_trabalhador TO authenticated;
GRANT ALL ON public.acoes_trabalhador TO service_role;
ALTER TABLE public.acoes_trabalhador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all acoes" ON public.acoes_trabalhador FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tg_acoes_updated BEFORE UPDATE ON public.acoes_trabalhador FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_acoes_trab ON public.acoes_trabalhador(trabalhador_id);
CREATE INDEX idx_acoes_venc ON public.acoes_trabalhador(data_vencimento);

-- ============ LAUDOS ============
CREATE TYPE public.laudo_tipo AS ENUM ('PCMSO', 'PGR', 'LTCAT', 'PPP', 'AVCB', 'outro');

CREATE TABLE public.laudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo laudo_tipo NOT NULL,
  titulo TEXT NOT NULL,
  data_emissao DATE,
  data_vencimento DATE,
  arquivo_url TEXT,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  trabalhador_id UUID REFERENCES public.trabalhadores(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laudos TO authenticated;
GRANT ALL ON public.laudos TO service_role;
ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all laudos" ON public.laudos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tg_laudos_updated BEFORE UPDATE ON public.laudos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_laudos_emp ON public.laudos(empresa_id);
CREATE INDEX idx_laudos_venc ON public.laudos(data_vencimento);
