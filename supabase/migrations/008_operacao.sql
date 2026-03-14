-- SGO — Migration 008: Módulo de Operação

-- ── ENUMs ────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE tipo_falta AS ENUM (
  'injustificada','justificada','abonada','suspensao_disciplinar','atraso_parcial'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE status_falta AS ENUM (
  'registrada','cancelada'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tipo_ocorrencia AS ENUM (
  'advertencia_verbal','advertencia_escrita','suspensao',
  'elogio','acidente_trabalho','insubordinacao','abandono_posto'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE status_extra AS ENUM (
  'pendente','aprovado_operacao','aprovado_rh','recusado','cancelado'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE motivo_extra AS ENUM (
  'cobertura_falta','demanda_cliente','escala_especial','outro'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE compensacao_feriado AS ENUM (
  'pagamento_dobro','folga_compensatoria'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Faltas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_faltas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  UUID NOT NULL REFERENCES sgo_colaboradores(id),
  alocacao_id     UUID NOT NULL REFERENCES sgo_alocacoes(id),
  data_falta      DATE NOT NULL,
  tipo            tipo_falta NOT NULL,
  horas_falta     NUMERIC(4,2) DEFAULT 8,     -- parcial para atraso
  observacoes     TEXT,
  documento_url   TEXT,                        -- atestado digitalizado
  status          status_falta NOT NULL DEFAULT 'registrada',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES sgo_usuarios(id),
  updated_by      UUID REFERENCES sgo_usuarios(id),
  -- Não duplicar falta do mesmo tipo no mesmo dia para a mesma alocação
  UNIQUE(colaborador_id, alocacao_id, data_falta, tipo)
);
CREATE INDEX IF NOT EXISTS idx_faltas_colaborador ON sgo_faltas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_faltas_alocacao    ON sgo_faltas(alocacao_id);
CREATE INDEX IF NOT EXISTS idx_faltas_data        ON sgo_faltas(data_falta);

-- ── Horas extras ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_extras (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id    UUID NOT NULL REFERENCES sgo_colaboradores(id),
  alocacao_id       UUID NOT NULL REFERENCES sgo_alocacoes(id),
  falta_id          UUID REFERENCES sgo_faltas(id),  -- preenchido quando motivo = cobertura_falta
  data_extra        DATE NOT NULL,
  horas             NUMERIC(4,2) NOT NULL,
  motivo            motivo_extra NOT NULL DEFAULT 'outro',
  descricao         TEXT,
  status            status_extra NOT NULL DEFAULT 'pendente',
  -- Aprovação operação
  aprovado_operacao_por  UUID REFERENCES sgo_usuarios(id),
  aprovado_operacao_em   TIMESTAMPTZ,
  recusa_operacao_motivo TEXT,
  -- Homologação RH
  aprovado_rh_por        UUID REFERENCES sgo_usuarios(id),
  aprovado_rh_em         TIMESTAMPTZ,
  recusa_rh_motivo       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID REFERENCES sgo_usuarios(id),
  updated_by        UUID REFERENCES sgo_usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_extras_colaborador ON sgo_extras(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_extras_alocacao    ON sgo_extras(alocacao_id);
CREATE INDEX IF NOT EXISTS idx_extras_status      ON sgo_extras(status);
CREATE INDEX IF NOT EXISTS idx_extras_data        ON sgo_extras(data_extra);

-- ── Ocorrências ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_ocorrencias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  UUID NOT NULL REFERENCES sgo_colaboradores(id),
  alocacao_id     UUID REFERENCES sgo_alocacoes(id),
  data_ocorrencia DATE NOT NULL,
  tipo            tipo_ocorrencia NOT NULL,
  descricao       TEXT NOT NULL,
  documento_url   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES sgo_usuarios(id),
  updated_by      UUID REFERENCES sgo_usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_colaborador ON sgo_ocorrencias(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_data        ON sgo_ocorrencias(data_ocorrencia);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_tipo        ON sgo_ocorrencias(tipo);

-- ── Feriados trabalhados ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_feriados_trabalhados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id    UUID NOT NULL REFERENCES sgo_colaboradores(id),
  alocacao_id       UUID NOT NULL REFERENCES sgo_alocacoes(id),
  feriado_id        UUID REFERENCES sgo_feriados(id),
  data_trabalho     DATE NOT NULL,
  horas_trabalhadas NUMERIC(4,2) NOT NULL DEFAULT 8,
  compensacao       compensacao_feriado NOT NULL,
  -- Se folga compensatória: data em que será tirada
  data_folga_compensatoria DATE,
  folga_usufruida   BOOLEAN DEFAULT FALSE,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID REFERENCES sgo_usuarios(id),
  updated_by        UUID REFERENCES sgo_usuarios(id),
  UNIQUE(colaborador_id, alocacao_id, data_trabalho)
);
CREATE INDEX IF NOT EXISTS idx_fer_trab_colaborador ON sgo_feriados_trabalhados(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_fer_trab_data        ON sgo_feriados_trabalhados(data_trabalho);

-- ── Triggers updated_at ───────────────────────────────────────
DO $$ BEGIN CREATE TRIGGER trg_faltas_updated_at BEFORE UPDATE ON sgo_faltas
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TRIGGER trg_extras_updated_at BEFORE UPDATE ON sgo_extras
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TRIGGER trg_ocorrencias_updated_at BEFORE UPDATE ON sgo_ocorrencias
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TRIGGER trg_fer_trab_updated_at BEFORE UPDATE ON sgo_feriados_trabalhados
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Views ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_faltas AS
SELECT
  f.id, f.data_falta, f.tipo, f.horas_falta, f.status, f.observacoes,
  f.colaborador_id, c.nome AS colaborador_nome, c.matricula,
  f.alocacao_id, p.nome AS posto_nome, fn.nome AS funcao_nome,
  u.nome AS registrado_por, f.created_at
FROM sgo_faltas f
JOIN sgo_colaboradores c ON c.id = f.colaborador_id
JOIN sgo_alocacoes     a ON a.id = f.alocacao_id
JOIN sgo_postos        p ON p.id = a.posto_id
JOIN sgo_funcoes      fn ON fn.id = a.funcao_id
LEFT JOIN sgo_usuarios u ON u.id = f.created_by;

CREATE OR REPLACE VIEW vw_extras AS
SELECT
  e.id, e.data_extra, e.horas, e.motivo, e.descricao, e.status,
  e.colaborador_id, c.nome AS colaborador_nome, c.matricula,
  e.alocacao_id, p.nome AS posto_nome, fn.nome AS funcao_nome,
  e.falta_id,
  uop.nome AS aprovado_operacao_por_nome, e.aprovado_operacao_em,
  urh.nome AS aprovado_rh_por_nome,       e.aprovado_rh_em,
  e.recusa_operacao_motivo, e.recusa_rh_motivo,
  uc.nome AS criado_por_nome, e.created_at
FROM sgo_extras e
JOIN sgo_colaboradores c  ON c.id  = e.colaborador_id
JOIN sgo_alocacoes     a  ON a.id  = e.alocacao_id
JOIN sgo_postos        p  ON p.id  = a.posto_id
JOIN sgo_funcoes      fn  ON fn.id = a.funcao_id
LEFT JOIN sgo_usuarios uop ON uop.id = e.aprovado_operacao_por
LEFT JOIN sgo_usuarios urh ON urh.id = e.aprovado_rh_por
LEFT JOIN sgo_usuarios uc  ON uc.id  = e.created_by;

CREATE OR REPLACE VIEW vw_ocorrencias AS
SELECT
  o.id, o.data_ocorrencia, o.tipo, o.descricao,
  o.colaborador_id, c.nome AS colaborador_nome, c.matricula,
  o.alocacao_id, p.nome AS posto_nome,
  u.nome AS registrado_por, o.created_at
FROM sgo_ocorrencias o
JOIN sgo_colaboradores c  ON c.id = o.colaborador_id
LEFT JOIN sgo_alocacoes a  ON a.id = o.alocacao_id
LEFT JOIN sgo_postos    p  ON p.id = a.posto_id
LEFT JOIN sgo_usuarios  u  ON u.id = o.created_by;
