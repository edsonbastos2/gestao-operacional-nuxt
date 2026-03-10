-- SGO — Migration 004: Colaboradores (idempotente)

-- ENUMs
DO $$ BEGIN CREATE TYPE status_colaborador AS ENUM ('ativo','inativo','reserva','desligado','afastado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_candidato AS ENUM ('pendente','aprovado','reprovado','desistiu');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sexo_tipo AS ENUM ('M','F','O');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE estado_civil_tipo AS ENUM ('solteiro','casado','divorciado','viuvo','uniao_estavel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_sanguineo AS ENUM ('A+','A-','B+','B-','AB+','AB-','O+','O-');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE turno_aso AS ENUM ('admissional','periodico','demissional','retorno','mudanca_funcao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE resultado_aso AS ENUM ('apto','apto_restricao','inapto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Candidatos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_candidatos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome         VARCHAR(200) NOT NULL,
  cpf          VARCHAR(14) NOT NULL UNIQUE,
  rg           VARCHAR(30),
  data_nasc    DATE,
  sexo         sexo_tipo,
  email        VARCHAR(150),
  telefone     VARCHAR(20),
  -- Endereço
  cep          VARCHAR(9),
  endereco     VARCHAR(300),
  cidade       VARCHAR(100),
  uf           CHAR(2),
  -- Vaga pretendida
  funcao_id    UUID REFERENCES sgo_funcoes(id),
  posto_id     UUID REFERENCES sgo_postos(id),
  -- Processo seletivo
  status       status_candidato NOT NULL DEFAULT 'pendente',
  observacoes  TEXT,
  reprovado_motivo TEXT,
  -- Controle
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID, updated_by UUID
);

-- ── Colaboradores ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_colaboradores (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidato_id      UUID REFERENCES sgo_candidatos(id),
  -- Dados pessoais
  nome              VARCHAR(200) NOT NULL,
  cpf               VARCHAR(14) NOT NULL UNIQUE,
  rg                VARCHAR(30),
  rg_orgao          VARCHAR(20),
  rg_data_emissao   DATE,
  data_nasc         DATE,
  sexo              sexo_tipo,
  estado_civil      estado_civil_tipo,
  tipo_sanguineo    tipo_sanguineo,
  nome_mae          VARCHAR(200),
  nome_pai          VARCHAR(200),
  -- Contato
  email             VARCHAR(150),
  telefone          VARCHAR(20),
  telefone2         VARCHAR(20),
  -- Endereço
  cep               VARCHAR(9),
  endereco          VARCHAR(300),
  complemento       VARCHAR(100),
  bairro            VARCHAR(100),
  cidade            VARCHAR(100),
  uf                CHAR(2),
  -- Documentação
  pis_pasep         VARCHAR(20),
  ctps_numero       VARCHAR(20),
  ctps_serie        VARCHAR(10),
  ctps_uf           CHAR(2),
  titulo_eleitor    VARCHAR(20),
  cnh               VARCHAR(20),
  cnh_categoria     VARCHAR(5),
  cnh_validade      DATE,
  -- Dados bancários
  banco             VARCHAR(100),
  agencia           VARCHAR(10),
  conta             VARCHAR(20),
  tipo_conta        VARCHAR(20),
  -- Vínculo
  prestadora_id     UUID REFERENCES sgo_prestadoras(id),
  data_admissao     DATE NOT NULL,
  data_demissao     DATE,
  matricula         VARCHAR(30),
  -- Status
  status            status_colaborador NOT NULL DEFAULT 'ativo',
  -- Controle
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID, updated_by UUID
);

-- ── Alocações (até 2 postos por colaborador) ──────────────────
CREATE TABLE IF NOT EXISTS sgo_alocacoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id  UUID NOT NULL REFERENCES sgo_colaboradores(id),
  posto_id        UUID NOT NULL REFERENCES sgo_postos(id),
  funcao_id       UUID NOT NULL REFERENCES sgo_funcoes(id),
  principal       BOOLEAN NOT NULL DEFAULT true,
  data_inicio     DATE NOT NULL,
  data_fim        DATE,
  status          status_ativo NOT NULL DEFAULT 'ativo',
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID, updated_by UUID
);

-- Garantir máx 2 alocações ativas por colaborador (via trigger)
CREATE OR REPLACE FUNCTION fn_check_max_alocacoes()
RETURNS TRIGGER AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM sgo_alocacoes
  WHERE colaborador_id = NEW.colaborador_id AND status = 'ativo' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');
  IF v_count >= 2 THEN
    RAISE EXCEPTION 'Colaborador já possui 2 alocações ativas (limite do sistema).';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_max_alocacoes ON sgo_alocacoes;
CREATE TRIGGER trg_check_max_alocacoes BEFORE INSERT ON sgo_alocacoes
  FOR EACH ROW EXECUTE FUNCTION fn_check_max_alocacoes();

-- ── ASO (Atestados de Saúde Ocupacional) ──────────────────────
CREATE TABLE IF NOT EXISTS sgo_asos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES sgo_colaboradores(id),
  tipo           turno_aso NOT NULL,
  resultado      resultado_aso NOT NULL,
  data_exame     DATE NOT NULL,
  data_validade  DATE,
  medico_nome    VARCHAR(200),
  medico_crm     VARCHAR(30),
  restricoes     TEXT,
  observacoes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID, updated_by UUID
);

-- ── Dependentes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_dependentes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES sgo_colaboradores(id),
  nome           VARCHAR(200) NOT NULL,
  parentesco     VARCHAR(50) NOT NULL,
  data_nasc      DATE,
  cpf            VARCHAR(14),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID, updated_by UUID
);

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_candidatos_upd ON sgo_candidatos;
CREATE TRIGGER trg_candidatos_upd BEFORE UPDATE ON sgo_candidatos FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_colaboradores_upd ON sgo_colaboradores;
CREATE TRIGGER trg_colaboradores_upd BEFORE UPDATE ON sgo_colaboradores FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_alocacoes_upd ON sgo_alocacoes;
CREATE TRIGGER trg_alocacoes_upd BEFORE UPDATE ON sgo_alocacoes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_asos_upd ON sgo_asos;
CREATE TRIGGER trg_asos_upd BEFORE UPDATE ON sgo_asos FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
DROP TRIGGER IF EXISTS trg_dependentes_upd ON sgo_dependentes;
CREATE TRIGGER trg_dependentes_upd BEFORE UPDATE ON sgo_dependentes FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_candidatos_cpf ON sgo_candidatos(cpf);
CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf ON sgo_colaboradores(cpf);
CREATE INDEX IF NOT EXISTS idx_colaboradores_prestadora ON sgo_colaboradores(prestadora_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON sgo_colaboradores(status);
CREATE INDEX IF NOT EXISTS idx_alocacoes_colaborador ON sgo_alocacoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_posto ON sgo_alocacoes(posto_id);
CREATE INDEX IF NOT EXISTS idx_asos_colaborador ON sgo_asos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_dependentes_colaborador ON sgo_dependentes(colaborador_id);

-- RLS
ALTER TABLE sgo_candidatos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_alocacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_asos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_dependentes   ENABLE ROW LEVEL SECURITY;

-- Políticas (drop e recria)
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['sgo_candidatos','sgo_colaboradores','sgo_alocacoes','sgo_asos','sgo_dependentes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS pol_%s_select ON %s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS pol_%s_write  ON %s', t, t);
  END LOOP;
END $$;

CREATE POLICY pol_sgo_candidatos_select   ON sgo_candidatos   FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_sgo_candidatos_write    ON sgo_candidatos   FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao','rh')));
CREATE POLICY pol_sgo_colaboradores_select ON sgo_colaboradores FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_sgo_colaboradores_write  ON sgo_colaboradores FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao','rh')));
CREATE POLICY pol_sgo_alocacoes_select    ON sgo_alocacoes    FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_sgo_alocacoes_write     ON sgo_alocacoes    FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao')));
CREATE POLICY pol_sgo_asos_select         ON sgo_asos         FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_sgo_asos_write          ON sgo_asos         FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao','rh')));
CREATE POLICY pol_sgo_dependentes_select  ON sgo_dependentes  FOR SELECT USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo'));
CREATE POLICY pol_sgo_dependentes_write   ON sgo_dependentes  FOR ALL    USING (EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao','rh')));
