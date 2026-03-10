-- SGO — Migration 005: Escalas e Calendário (idempotente)

-- ENUMs
DO $$ BEGIN CREATE TYPE tipo_turno AS ENUM ('diurno','noturno','misto','12x36','12x24','outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_dia_calendario AS ENUM ('normal','folga','feriado','feriado_trabalhado','ferias','afastamento','outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_escala AS ENUM ('ativo','inativo','arquivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Escalas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_escalas (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome         VARCHAR(150) NOT NULL,
  descricao    TEXT,
  posto_id     UUID REFERENCES sgo_postos(id),
  funcao_id    UUID REFERENCES sgo_funcoes(id),
  status       status_escala NOT NULL DEFAULT 'ativo',
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID, updated_by UUID
);

-- ── Turnos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_turnos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escala_id    UUID NOT NULL REFERENCES sgo_escalas(id),
  nome         VARCHAR(100) NOT NULL,
  tipo         tipo_turno NOT NULL DEFAULT 'diurno',
  hora_inicio  TIME NOT NULL,
  hora_fim     TIME NOT NULL,
  intervalo_min SMALLINT DEFAULT 60,
  carga_horaria_dia NUMERIC(4,2),
  dias_semana  SMALLINT[] DEFAULT ARRAY[1,2,3,4,5],  -- 0=dom,1=seg,...,6=sab
  status       status_ativo NOT NULL DEFAULT 'ativo',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID, updated_by UUID
);

-- ── Feriados ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_feriados (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data       DATE NOT NULL,
  nome       VARCHAR(200) NOT NULL,
  tipo       VARCHAR(30) NOT NULL DEFAULT 'nacional',  -- nacional, estadual, municipal
  uf         CHAR(2),
  municipio  VARCHAR(100),
  recorrente BOOLEAN NOT NULL DEFAULT true,  -- repete todo ano
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID, updated_by UUID
);

-- ── Calendário de Competência ─────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_calendario (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id  UUID NOT NULL REFERENCES sgo_colaboradores(id),
  escala_id       UUID REFERENCES sgo_escalas(id),
  turno_id        UUID REFERENCES sgo_turnos(id),
  competencia     CHAR(7) NOT NULL,  -- 'YYYY-MM'
  data            DATE NOT NULL,
  tipo_dia        tipo_dia_calendario NOT NULL DEFAULT 'normal',
  hora_inicio     TIME,
  hora_fim        TIME,
  observacoes     TEXT,
  ajustado        BOOLEAN NOT NULL DEFAULT false,  -- indica ajuste pós-geração (RF-033)
  ajustado_por    UUID REFERENCES sgo_usuarios(id),
  ajustado_em     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID, updated_by UUID,
  UNIQUE(colaborador_id, data)
);

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_escalas_upd  ON sgo_escalas;
CREATE TRIGGER trg_escalas_upd  BEFORE UPDATE ON sgo_escalas  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_turnos_upd   ON sgo_turnos;
CREATE TRIGGER trg_turnos_upd   BEFORE UPDATE ON sgo_turnos   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_feriados_upd ON sgo_feriados;
CREATE TRIGGER trg_feriados_upd BEFORE UPDATE ON sgo_feriados FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_calendario_upd ON sgo_calendario;
CREATE TRIGGER trg_calendario_upd BEFORE UPDATE ON sgo_calendario FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_turnos_escala      ON sgo_turnos(escala_id);
CREATE INDEX IF NOT EXISTS idx_feriados_data       ON sgo_feriados(data);
CREATE INDEX IF NOT EXISTS idx_feriados_uf         ON sgo_feriados(uf);
CREATE UNIQUE INDEX IF NOT EXISTS uq_feriados_data_localidade ON sgo_feriados (data, COALESCE(uf,''), COALESCE(municipio,''));
CREATE INDEX IF NOT EXISTS idx_calendario_colab    ON sgo_calendario(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_calendario_comp     ON sgo_calendario(competencia);
CREATE INDEX IF NOT EXISTS idx_calendario_data     ON sgo_calendario(data);
CREATE INDEX IF NOT EXISTS idx_calendario_escala   ON sgo_calendario(escala_id);

-- RLS
ALTER TABLE sgo_escalas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_turnos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_feriados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_calendario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pol_escalas_select    ON sgo_escalas;
DROP POLICY IF EXISTS pol_escalas_write     ON sgo_escalas;
DROP POLICY IF EXISTS pol_turnos_select     ON sgo_turnos;
DROP POLICY IF EXISTS pol_turnos_write      ON sgo_turnos;
DROP POLICY IF EXISTS pol_feriados_select   ON sgo_feriados;
DROP POLICY IF EXISTS pol_feriados_write    ON sgo_feriados;
DROP POLICY IF EXISTS pol_calendario_select ON sgo_calendario;
DROP POLICY IF EXISTS pol_calendario_write  ON sgo_calendario;

CREATE POLICY pol_escalas_select    ON sgo_escalas    FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_escalas_write     ON sgo_escalas    FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao')));
CREATE POLICY pol_turnos_select     ON sgo_turnos     FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_turnos_write      ON sgo_turnos     FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao')));
CREATE POLICY pol_feriados_select   ON sgo_feriados   FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_feriados_write    ON sgo_feriados   FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao')));
CREATE POLICY pol_calendario_select ON sgo_calendario FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_calendario_write  ON sgo_calendario FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao')));