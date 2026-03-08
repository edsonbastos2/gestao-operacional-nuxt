-- SGO — Migration 001: Schema base
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE status_ativo       AS ENUM ('ativo','inativo');
CREATE TYPE perfil_setor       AS ENUM ('ti_admin','operacao','rh','financeiro','controladoria','supervisor_externo');
CREATE TYPE capacidade_critica AS ENUM ('aprovar_extras','cancelar_excluir','reabrir_competencia','ajustar_calendario','parametrizar_critico');
CREATE TYPE tipo_acao          AS ENUM ('V','C','E','L','D','A','P','X','AU');
CREATE TYPE status_competencia AS ENUM ('aberta','fechada');

CREATE TABLE sgo_usuarios (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome             VARCHAR(150) NOT NULL,
  email            VARCHAR(150) NOT NULL UNIQUE,
  login            VARCHAR(80)  NOT NULL UNIQUE,
  perfil           perfil_setor NOT NULL,
  status           status_ativo NOT NULL DEFAULT 'ativo',
  tentativas_login SMALLINT     NOT NULL DEFAULT 0,
  ultimo_acesso    TIMESTAMPTZ,
  primeiro_acesso  BOOLEAN      NOT NULL DEFAULT TRUE,
  escopo_tomador_ids UUID[], escopo_posto_ids UUID[], escopo_turno_ids UUID[],
  cancelled_at TIMESTAMPTZ, cancelled_by UUID, cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_supervisor CHECK (
    perfil <> 'supervisor_externo'
    OR (escopo_tomador_ids IS NOT NULL AND array_length(escopo_tomador_ids,1) > 0)
  )
);

CREATE TABLE sgo_capacidades_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID NOT NULL REFERENCES sgo_usuarios(id) ON DELETE CASCADE,
  capacidade  capacidade_critica NOT NULL,
  gerente_id  UUID NOT NULL REFERENCES sgo_usuarios(id),
  justificativa TEXT NOT NULL,
  validade    DATE,
  revogada_em TIMESTAMPTZ,
  revogada_por UUID REFERENCES sgo_usuarios(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, capacidade)
);

CREATE TABLE sgo_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entidade       VARCHAR(100) NOT NULL,
  entidade_id    UUID,
  acao           tipo_acao NOT NULL,
  usuario_id     UUID,
  usuario_nome   VARCHAR(150),
  usuario_perfil perfil_setor,
  antes JSONB, depois JSONB, justificativa TEXT, ip INET, metadata JSONB
);

CREATE TABLE sgo_competencias (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mes  SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano  SMALLINT NOT NULL CHECK (ano >= 2020),
  status_competencia status_competencia NOT NULL DEFAULT 'aberta',
  abertura  DATE NOT NULL,
  fechamento DATE NOT NULL,
  reaberta_em TIMESTAMPTZ, reaberta_por UUID, reabertura_justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mes, ano),
  CONSTRAINT chk_janela CHECK (fechamento >= abertura)
);

CREATE RULE audit_no_update AS ON UPDATE TO sgo_audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_no_delete AS ON DELETE TO sgo_audit_logs DO INSTEAD NOTHING;

CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_usuarios_upd BEFORE UPDATE ON sgo_usuarios FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_competencias_upd BEFORE UPDATE ON sgo_competencias FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE FUNCTION fn_audit(p_entidade VARCHAR, p_entidade_id UUID, p_acao tipo_acao,
  p_usuario_id UUID, p_usuario_nome VARCHAR, p_antes JSONB DEFAULT NULL, p_depois JSONB DEFAULT NULL,
  p_justificativa TEXT DEFAULT NULL, p_metadata JSONB DEFAULT NULL) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO sgo_audit_logs(entidade,entidade_id,acao,usuario_id,usuario_nome,antes,depois,justificativa,metadata)
  VALUES(p_entidade,p_entidade_id,p_acao,p_usuario_id,p_usuario_nome,p_antes,p_depois,p_justificativa,p_metadata)
  RETURNING id INTO v_id; RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE sgo_usuarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_capacidades_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_audit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgo_competencias        ENABLE ROW LEVEL SECURITY;

CREATE POLICY pol_usuarios_select ON sgo_usuarios FOR SELECT USING (
  id = (SELECT id FROM sgo_usuarios WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil = 'ti_admin')
);
CREATE POLICY pol_usuarios_write ON sgo_usuarios FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil = 'ti_admin')
);
CREATE POLICY pol_audit_select ON sgo_audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('controladoria','ti_admin'))
);
CREATE POLICY pol_audit_insert ON sgo_audit_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY pol_competencias_select ON sgo_competencias FOR SELECT USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.status = 'ativo')
);
CREATE POLICY pol_competencias_write ON sgo_competencias FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil IN ('ti_admin','operacao'))
);

GRANT EXECUTE ON FUNCTION fn_audit TO service_role;
GRANT INSERT ON sgo_audit_logs TO service_role;

INSERT INTO sgo_competencias (mes, ano, status_competencia, abertura, fechamento) VALUES (
  EXTRACT(MONTH FROM NOW())::SMALLINT, EXTRACT(YEAR FROM NOW())::SMALLINT, 'aberta',
  DATE_TRUNC('month', NOW())::DATE,
  (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::DATE
);
