-- SGO — Migration 007: Módulo de Benefícios (CCT + adesão individual)

-- ── ENUMs ────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE tipo_beneficio AS ENUM (
  'vale_transporte','vale_alimentacao','cesta_basica','saude','odonto','outros'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE obrigatoriedade_beneficio AS ENUM (
  'obrigatorio','opcional'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE status_adesao AS ENUM (
  'ativo','recusado','suspenso','cancelado'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE forma_pagamento_beneficio AS ENUM (
  'dinheiro','cartao','fisico','deposito','via_va'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE custeio_saude AS ENUM (
  'prestadora_100','coparticipacao'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE parentesco_direto AS ENUM (
  'conjuge','filho','enteado','pai','mae'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CCTs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_ccts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id   UUID NOT NULL REFERENCES sgo_prestadoras(id),
  nome            TEXT NOT NULL,
  sindicato       TEXT,
  numero_registro TEXT,
  data_inicio     DATE NOT NULL,
  data_fim        DATE,
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES sgo_usuarios(id),
  updated_by      UUID REFERENCES sgo_usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_ccts_prestadora ON sgo_ccts(prestadora_id);

-- Vínculo CCT ↔ Função
CREATE TABLE IF NOT EXISTS sgo_cct_funcoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cct_id      UUID NOT NULL REFERENCES sgo_ccts(id),
  funcao_id   UUID NOT NULL REFERENCES sgo_funcoes(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cct_id, funcao_id)
);
CREATE INDEX IF NOT EXISTS idx_cct_funcoes_cct    ON sgo_cct_funcoes(cct_id);
CREATE INDEX IF NOT EXISTS idx_cct_funcoes_funcao ON sgo_cct_funcoes(funcao_id);

-- ── Benefícios definidos pela CCT ────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_cct_beneficios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cct_id           UUID NOT NULL REFERENCES sgo_ccts(id),
  tipo             tipo_beneficio NOT NULL,
  nome             TEXT NOT NULL,
  obrigatoriedade  obrigatoriedade_beneficio NOT NULL DEFAULT 'obrigatorio',

  -- Forma de pagamento
  -- cesta_basica: dinheiro | via_va | fisico
  -- vale_alimentacao: cartao | dinheiro | deposito
  -- vale_transporte: cartao | dinheiro
  -- saude/odonto: não se aplica (controlado por sgo_saude_planos)
  forma_pagamento  forma_pagamento_beneficio NOT NULL DEFAULT 'dinheiro',

  -- Saúde: custeio configurável pela prestadora
  -- odonto: sempre colaborador_100 (custo total do colaborador)
  custeio_saude    custeio_saude,                    -- NULL para não-saúde
  valor_coparticipacao NUMERIC(10,2),                -- preenchido quando custeio = coparticipacao

  -- Valor e desconto
  valor_unitario   NUMERIC(10,2),
  percentual_desconto_colaborador NUMERIC(5,2) DEFAULT 0, -- ex: 6% VT pela CLT
  valor_desconto_fixo NUMERIC(10,2),
  unidade          TEXT DEFAULT 'dia',               -- dia | mes | unidade

  vigencia_inicio  DATE NOT NULL,
  vigencia_fim     DATE,
  observacoes      TEXT,
  status           TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID REFERENCES sgo_usuarios(id),
  updated_by       UUID REFERENCES sgo_usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_cct_beneficios_cct  ON sgo_cct_beneficios(cct_id);
CREATE INDEX IF NOT EXISTS idx_cct_beneficios_tipo ON sgo_cct_beneficios(tipo);

-- ── Fornecedores de benefícios ────────────────────────────────
CREATE TABLE IF NOT EXISTS sgo_beneficio_fornecedores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestadora_id UUID NOT NULL REFERENCES sgo_prestadoras(id),
  nome          TEXT NOT NULL,
  tipo          tipo_beneficio NOT NULL,
  cnpj          TEXT,
  contato       TEXT,
  observacoes   TEXT,
  status        TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES sgo_usuarios(id),
  updated_by    UUID REFERENCES sgo_usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_beneficio_fornecedores_prestadora ON sgo_beneficio_fornecedores(prestadora_id);

-- ── Dependentes diretos (para plano de saúde) ─────────────────
-- Restringe aos parentescos diretos: cônjuge, filho, enteado, pai, mãe
-- Odonto é custeado 100% pelo colaborador — sem cobertura de dependentes pela prestadora
CREATE TABLE IF NOT EXISTS sgo_dependentes_diretos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  UUID NOT NULL REFERENCES sgo_colaboradores(id),
  nome            TEXT NOT NULL,
  parentesco      parentesco_direto NOT NULL,  -- só aceita dependentes diretos
  cpf             TEXT,
  data_nasc       DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  -- Um CPF não pode ser dependente direto duas vezes no mesmo colaborador
  UNIQUE(colaborador_id, cpf)
);
CREATE INDEX IF NOT EXISTS idx_dep_diretos_colaborador ON sgo_dependentes_diretos(colaborador_id);

-- ── Adesão individual do colaborador ─────────────────────────
CREATE TABLE IF NOT EXISTS sgo_colaborador_beneficios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id      UUID NOT NULL REFERENCES sgo_colaboradores(id),
  cct_beneficio_id    UUID NOT NULL REFERENCES sgo_cct_beneficios(id),
  alocacao_id         UUID NOT NULL REFERENCES sgo_alocacoes(id),
  fornecedor_id       UUID REFERENCES sgo_beneficio_fornecedores(id),
  status              status_adesao NOT NULL DEFAULT 'ativo',
  data_adesao         DATE NOT NULL,
  data_cancelamento   DATE,
  motivo_recusa       TEXT,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES sgo_usuarios(id),
  updated_by          UUID REFERENCES sgo_usuarios(id),
  UNIQUE(colaborador_id, cct_beneficio_id, alocacao_id)
);
CREATE INDEX IF NOT EXISTS idx_colab_benef_colaborador ON sgo_colaborador_beneficios(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colab_benef_alocacao    ON sgo_colaborador_beneficios(alocacao_id);

-- ── Planos de saúde ───────────────────────────────────────────
-- Odonto: custeio sempre do colaborador (100%), sem inclusão de dependentes
-- Saúde:  custeio definido na CCT (prestadora_100 ou coparticipacao)
--         dependentes permitidos somente se parentesco_direto
CREATE TABLE IF NOT EXISTS sgo_saude_planos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id      UUID NOT NULL REFERENCES sgo_colaboradores(id),
  colab_beneficio_id  UUID NOT NULL REFERENCES sgo_colaborador_beneficios(id),
  fornecedor_id       UUID REFERENCES sgo_beneficio_fornecedores(id),
  tipo                TEXT NOT NULL CHECK (tipo IN ('saude','odonto')),
  numero_carteirinha  TEXT,
  -- Custeio efetivo (herdado da CCT, mas registrado para histórico)
  custeio             custeio_saude,               -- NULL para odonto (colaborador paga 100%)
  valor_coparticipacao NUMERIC(10,2),              -- valor mensal descontado quando coparticipacao
  data_inclusao       DATE NOT NULL,
  data_exclusao       DATE,
  status              TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES sgo_usuarios(id),
  updated_by          UUID REFERENCES sgo_usuarios(id)
);

-- Dependentes no plano de SAÚDE (não permitido para odonto)
CREATE TABLE IF NOT EXISTS sgo_saude_dependentes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id         UUID NOT NULL REFERENCES sgo_saude_planos(id),
  dependente_id    UUID NOT NULL REFERENCES sgo_dependentes_diretos(id),
  data_inclusao    DATE NOT NULL,
  data_exclusao    DATE,
  status           TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plano_id, dependente_id)
);

-- ── Triggers updated_at ───────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER trg_ccts_updated_at BEFORE UPDATE ON sgo_ccts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_cct_beneficios_updated_at BEFORE UPDATE ON sgo_cct_beneficios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_colab_benef_updated_at BEFORE UPDATE ON sgo_colaborador_beneficios
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_fornecedores_updated_at BEFORE UPDATE ON sgo_beneficio_fornecedores
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_dep_diretos_updated_at BEFORE UPDATE ON sgo_dependentes_diretos
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── View benefícios ativos por colaborador ────────────────────
CREATE OR REPLACE VIEW vw_colaborador_beneficios AS
SELECT
  cb.id,
  cb.colaborador_id,
  c.nome                        AS colaborador_nome,
  cb.alocacao_id,
  a.posto_id,
  p.nome                        AS posto_nome,
  a.funcao_id,
  f.nome                        AS funcao_nome,
  cb.cct_beneficio_id,
  cb.status,
  cb.data_adesao,
  cb.motivo_recusa,
  b.tipo,
  b.nome                        AS beneficio_nome,
  b.obrigatoriedade,
  b.forma_pagamento,
  b.custeio_saude,
  b.valor_coparticipacao,
  b.valor_unitario,
  b.percentual_desconto_colaborador,
  b.valor_desconto_fixo,
  b.unidade,
  b.vigencia_inicio,
  b.vigencia_fim,
  ct.nome                       AS cct_nome,
  ct.prestadora_id,
  pr.razao_social               AS prestadora_nome,
  forn.nome                     AS fornecedor_nome
FROM sgo_colaborador_beneficios cb
JOIN sgo_colaboradores          c    ON c.id  = cb.colaborador_id
JOIN sgo_alocacoes              a    ON a.id  = cb.alocacao_id
JOIN sgo_postos                 p    ON p.id  = a.posto_id
JOIN sgo_funcoes                f    ON f.id  = a.funcao_id
JOIN sgo_cct_beneficios         b    ON b.id  = cb.cct_beneficio_id
JOIN sgo_ccts                   ct   ON ct.id = b.cct_id
JOIN sgo_prestadoras            pr   ON pr.id = ct.prestadora_id
LEFT JOIN sgo_beneficio_fornecedores forn ON forn.id = cb.fornecedor_id;
