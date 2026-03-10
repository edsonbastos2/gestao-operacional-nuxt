-- SGO — Migration 003: Cadastros Mestres (idempotente)

-- ENUMs
DO $$ BEGIN CREATE TYPE status_tomador AS ENUM ('ativo','inativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_beneficio_vt AS ENUM ('dinheiro','cartao','vale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Prestadoras ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_prestadoras (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  cnpj        VARCHAR(18) NOT NULL UNIQUE,
  email       VARCHAR(150),
  telefone    VARCHAR(20),
  status      status_ativo NOT NULL DEFAULT 'ativo',
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID, updated_by UUID
);

-- ── Tomadores ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_tomadores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestadora_id UUID NOT NULL REFERENCES sgo_prestadoras(id),
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  cnpj         VARCHAR(18) NOT NULL UNIQUE,
  email        VARCHAR(150),
  telefone     VARCHAR(20),
  -- Parâmetros VTD/VA
  usa_vt        BOOLEAN NOT NULL DEFAULT false,
  tipo_vt       tipo_beneficio_vt,
  valor_vt_dia  NUMERIC(10,2),
  dias_uteis_vt SMALLINT DEFAULT 22,
  usa_va        BOOLEAN NOT NULL DEFAULT false,
  valor_va_dia  NUMERIC(10,2),
  dias_uteis_va SMALLINT DEFAULT 22,
  status       status_ativo NOT NULL DEFAULT 'ativo',
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID, updated_by UUID
);

-- ── Postos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_postos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tomador_id   UUID NOT NULL REFERENCES sgo_tomadores(id),
  nome         VARCHAR(200) NOT NULL,
  endereco     VARCHAR(300),
  cidade       VARCHAR(100),
  uf           CHAR(2),
  status       status_ativo NOT NULL DEFAULT 'ativo',
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID, updated_by UUID
);

-- ── Funções ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_funcoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        VARCHAR(150) NOT NULL UNIQUE,
  descricao   TEXT,
  cbo         VARCHAR(10),
  status      status_ativo NOT NULL DEFAULT 'ativo',
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID, updated_by UUID
);

-- ── Vagas por Posto/Função ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_vagas (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  posto_id   UUID NOT NULL REFERENCES sgo_postos(id),
  funcao_id  UUID NOT NULL REFERENCES sgo_funcoes(id),
  quantidade SMALLINT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  status     status_ativo NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID, updated_by UUID,
  UNIQUE(posto_id, funcao_id)
);

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_prestadoras_upd ON sgo_prestadoras;
CREATE TRIGGER trg_prestadoras_upd BEFORE UPDATE ON sgo_prestadoras FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_tomadores_upd ON sgo_tomadores;
CREATE TRIGGER trg_tomadores_upd BEFORE UPDATE ON sgo_tomadores FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_postos_upd ON sgo_postos;
CREATE TRIGGER trg_postos_upd BEFORE UPDATE ON sgo_postos FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_funcoes_upd ON sgo_funcoes;
CREATE TRIGGER trg_funcoes_upd BEFORE UPDATE ON sgo_funcoes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_vagas_upd ON sgo_vagas;
CREATE TRIGGER trg_vagas_upd BEFORE UPDATE ON sgo_vagas FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_tomadores_prestadora ON sgo_tomadores(prestadora_id);
CREATE INDEX IF NOT EXISTS idx_postos_tomador ON sgo_postos(tomador_id);
CREATE INDEX IF NOT EXISTS idx_vagas_posto ON sgo_vagas(posto_id);
CREATE INDEX IF NOT EXISTS idx_vagas_funcao ON sgo_vagas(funcao_id);

-- RLS
ALTER TABLE sgo_prestadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_tomadores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_postos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_funcoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_vagas       ENABLE ROW LEVEL SECURITY;

-- Políticas (drop e recria para idempotência)
DROP POLICY IF EXISTS pol_prestadoras_select ON sgo_prestadoras;
DROP POLICY IF EXISTS pol_prestadoras_write  ON sgo_prestadoras;
DROP POLICY IF EXISTS pol_tomadores_select   ON sgo_tomadores;
DROP POLICY IF EXISTS pol_tomadores_write    ON sgo_tomadores;
DROP POLICY IF EXISTS pol_postos_select      ON sgo_postos;
DROP POLICY IF EXISTS pol_postos_write       ON sgo_postos;
DROP POLICY IF EXISTS pol_funcoes_select     ON sgo_funcoes;
DROP POLICY IF EXISTS pol_funcoes_write      ON sgo_funcoes;
DROP POLICY IF EXISTS pol_vagas_select       ON sgo_vagas;
DROP POLICY IF EXISTS pol_vagas_write        ON sgo_vagas;

-- Leitura: qualquer usuário ativo
CREATE POLICY pol_prestadoras_select ON sgo_prestadoras FOR SELECT USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo')
);
CREATE POLICY pol_tomadores_select ON sgo_tomadores FOR SELECT USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo')
);
CREATE POLICY pol_postos_select ON sgo_postos FOR SELECT USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo')
);
CREATE POLICY pol_funcoes_select ON sgo_funcoes FOR SELECT USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo')
);
CREATE POLICY pol_vagas_select ON sgo_vagas FOR SELECT USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo')
);

-- Escrita: ti_admin e operacao
CREATE POLICY pol_prestadoras_write ON sgo_prestadoras FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao'))
);
CREATE POLICY pol_tomadores_write ON sgo_tomadores FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao'))
);
CREATE POLICY pol_postos_write ON sgo_postos FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao'))
);
CREATE POLICY pol_funcoes_write ON sgo_funcoes FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao'))
);
CREATE POLICY pol_vagas_write ON sgo_vagas FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao'))
);
