-- ==============================================================================
-- INVBECS - SCHEMA PARA SUPABASE (PostgreSQL + Realtime)
-- Instruções:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Entre no seu projeto e clique em "SQL Editor" no menu lateral esquerdo
-- 3. Clique em "New query", cole todo este código e clique em "Run" (Executar)
-- ==============================================================================

-- 1. TABELA DE EQUIPAMENTOS
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id BIGINT PRIMARY KEY,
  patrimonio TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  marca TEXT,
  modelo TEXT,
  serial TEXT,
  nf TEXT,
  "dataAquisicao" TEXT,
  valor NUMERIC(12, 2) DEFAULT 0,
  responsavel TEXT,
  localizacao TEXT,
  status TEXT DEFAULT 'Ativo',
  garantia TEXT,
  especificacoes TEXT,
  observacoes TEXT,
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE COLABORADORES
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id BIGINT PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT,
  setor TEXT,
  email TEXT,
  telefone TEXT,
  matricula TEXT,
  observacoes TEXT,
  obs TEXT,
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE MOVIMENTAÇÕES
CREATE TABLE IF NOT EXISTS public.movimentacoes (
  id BIGINT PRIMARY KEY,
  "equipamentoId" BIGINT,
  "equipamentoDesc" TEXT,
  tipo TEXT,
  de TEXT,
  para TEXT,
  responsavel TEXT,
  data TEXT,
  observacoes TEXT,
  obs TEXT,
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE MANUTENÇÕES (ORDENS DE SERVIÇO)
CREATE TABLE IF NOT EXISTS public.manutencoes (
  id BIGINT PRIMARY KEY,
  "equipamentoId" BIGINT,
  "equipamentoDesc" TEXT,
  tipo TEXT,
  fornecedor TEXT,
  problema TEXT,
  solucao TEXT,
  tecnico TEXT,
  defeito TEXT,
  servico TEXT,
  obs TEXT,
  observacoes TEXT,
  "dataAbertura" TEXT,
  "dataConclusao" TEXT,
  custo NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'Aberta',
  "dataCadastro" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE CONFIGURAÇÕES & METADADOS (Setores, Localizações, Perfil)
CREATE TABLE IF NOT EXISTS public.sistema_meta (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE HISTÓRICO DE ATIVIDADES
CREATE TABLE IF NOT EXISTS public.atividades (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  time TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- MIGRAÇÃO DE COLUNAS (garante compatibilidade caso já tenha executado antes)
-- ==============================================================================
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS obs TEXT;
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS observacoes TEXT;

ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS obs TEXT;
ALTER TABLE public.movimentacoes ADD COLUMN IF NOT EXISTS observacoes TEXT;

ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS tecnico TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS defeito TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS servico TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS obs TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS problema TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS solucao TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE public.manutencoes ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ==============================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_equip_patrimonio ON public.equipamentos(patrimonio);
CREATE INDEX IF NOT EXISTS idx_equip_status ON public.equipamentos(status);
CREATE INDEX IF NOT EXISTS idx_equip_categoria ON public.equipamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_equip_responsavel ON public.equipamentos(responsavel);
CREATE INDEX IF NOT EXISTS idx_colab_nome ON public.colaboradores(nome);
CREATE INDEX IF NOT EXISTS idx_colab_setor ON public.colaboradores(setor);
CREATE INDEX IF NOT EXISTS idx_mov_equipId ON public.movimentacoes("equipamentoId");
CREATE INDEX IF NOT EXISTS idx_manu_equipId ON public.manutencoes("equipamentoId");

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS PÚBLICAS (ANON KEY)
-- Permite leitura e escrita seguras utilizando a Chave Pública Anon do Supabase
-- ==============================================================================
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sistema_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso irrestrito para clientes autenticados via Anon Key
DO $$
BEGIN
  -- Equipamentos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'equipamentos' AND policyname = 'Acesso publico anon equipamentos') THEN
    CREATE POLICY "Acesso publico anon equipamentos" ON public.equipamentos FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Colaboradores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colaboradores' AND policyname = 'Acesso publico anon colaboradores') THEN
    CREATE POLICY "Acesso publico anon colaboradores" ON public.colaboradores FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Movimentações
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'movimentacoes' AND policyname = 'Acesso publico anon movimentacoes') THEN
    CREATE POLICY "Acesso publico anon movimentacoes" ON public.movimentacoes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Manutenções
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'manutencoes' AND policyname = 'Acesso publico anon manutencoes') THEN
    CREATE POLICY "Acesso publico anon manutencoes" ON public.manutencoes FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Metadados
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sistema_meta' AND policyname = 'Acesso publico anon sistema_meta') THEN
    CREATE POLICY "Acesso publico anon sistema_meta" ON public.sistema_meta FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Atividades
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'atividades' AND policyname = 'Acesso publico anon atividades') THEN
    CREATE POLICY "Acesso publico anon atividades" ON public.atividades FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ==============================================================================
-- ATIVAR SINCRONIZAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- Permite que alterações feitas no celular apareçam instantaneamente no computador
-- ==============================================================================
DO $$
BEGIN
  -- Adiciona tabelas na publicação Realtime caso ainda não estejam
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.equipamentos;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.colaboradores;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manutencoes;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sistema_meta;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.atividades;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

-- Fim do script
