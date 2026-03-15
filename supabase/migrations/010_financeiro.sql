-- SGO — Migration 010: Financeiro / Folha de Pagamento

-- ── Histórico salarial ────────────────────────────────────────
-- Um registro por alteração salarial. A folha consulta o valor
-- vigente na competência calculada.
CREATE TABLE IF NOT EXISTS sgo_historico_salarial (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id  UUID NOT NULL REFERENCES sgo_colaboradores(id),
  salario         NUMERIC(10,2) NOT NULL,
  vigencia_inicio DATE NOT NULL,   -- primeiro dia de vigência
  vigencia_fim    DATE,            -- NULL = vigente até hoje
  motivo          TEXT,            -- ex: "Admissão", "Dissídio 2026", "Promoção"
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES sgo_usuarios(id),
  updated_by      UUID REFERENCES sgo_usuarios(id)
);
CREATE INDEX IF NOT EXISTS idx_hist_sal_colaborador ON sgo_historico_salarial(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_hist_sal_vigencia    ON sgo_historico_salarial(vigencia_inicio);

-- Garante que não existe sobreposição de vigência para o mesmo colaborador
CREATE UNIQUE INDEX IF NOT EXISTS uq_hist_sal_vigencia
  ON sgo_historico_salarial(colaborador_id, vigencia_inicio);

-- ── Folha de pagamento ────────────────────────────────────────
-- Um registro por colaborador por competência
CREATE TABLE IF NOT EXISTS sgo_folha_pagamento (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id    UUID NOT NULL REFERENCES sgo_competencias(id),
  colaborador_id    UUID NOT NULL REFERENCES sgo_colaboradores(id),
  alocacao_id       UUID REFERENCES sgo_alocacoes(id),
  prestadora_id     UUID REFERENCES sgo_prestadoras(id),

  -- Referências de cálculo
  salario_base      NUMERIC(10,2) NOT NULL,
  dias_uteis        INTEGER NOT NULL DEFAULT 0,
  dias_trabalhados  INTEGER NOT NULL DEFAULT 0,
  hora_normal       NUMERIC(10,4) NOT NULL DEFAULT 0, -- salario / 220

  -- Proventos
  salario_bruto          NUMERIC(10,2) NOT NULL DEFAULT 0, -- salario proporcional aos dias trab.
  valor_horas_extras     NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_feriados         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_proventos        NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Descontos
  desconto_faltas        NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto_vt            NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_descontos        NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Líquido
  salario_liquido        NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Detalhamento (para auditoria)
  qtd_faltas_injustificadas INTEGER DEFAULT 0,
  horas_extras_pagas        NUMERIC(6,2) DEFAULT 0,
  feriados_com_adicional    INTEGER DEFAULT 0,
  horas_feriados_pagas      NUMERIC(6,2) DEFAULT 0,

  -- Controle
  status    TEXT NOT NULL DEFAULT 'calculado' CHECK (status IN ('calculado','revisado','exportado')),
  gerado_em TIMESTAMPTZ DEFAULT NOW(),
  gerado_por UUID REFERENCES sgo_usuarios(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES sgo_usuarios(id),

  UNIQUE(competencia_id, colaborador_id, alocacao_id)
);
CREATE INDEX IF NOT EXISTS idx_folha_competencia  ON sgo_folha_pagamento(competencia_id);
CREATE INDEX IF NOT EXISTS idx_folha_colaborador  ON sgo_folha_pagamento(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_folha_prestadora   ON sgo_folha_pagamento(prestadora_id);

-- ── Trigger updated_at ────────────────────────────────────────
DO $$ BEGIN
  CREATE TRIGGER trg_hist_sal_updated_at BEFORE UPDATE ON sgo_historico_salarial
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_folha_updated_at BEFORE UPDATE ON sgo_folha_pagamento
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Função: salário vigente na data ───────────────────────────
CREATE OR REPLACE FUNCTION fn_salario_vigente(p_colaborador_id UUID, p_data DATE)
RETURNS NUMERIC AS $$
  SELECT salario
  FROM sgo_historico_salarial
  WHERE colaborador_id = p_colaborador_id
    AND vigencia_inicio <= p_data
    AND (vigencia_fim IS NULL OR vigencia_fim >= p_data)
  ORDER BY vigencia_inicio DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ── View folha resumida ────────────────────────────────────────
CREATE OR REPLACE VIEW vw_folha_resumo AS
SELECT
  f.*,
  c.nome        AS colaborador_nome,
  c.matricula   AS colaborador_matricula,
  p.nome        AS posto_nome,
  fn.nome       AS funcao_nome,
  pr.razao_social AS prestadora_nome,
  comp.ano, comp.mes
FROM sgo_folha_pagamento f
JOIN sgo_colaboradores c   ON c.id   = f.colaborador_id
JOIN sgo_competencias comp ON comp.id = f.competencia_id
LEFT JOIN sgo_alocacoes  a  ON a.id   = f.alocacao_id
LEFT JOIN sgo_postos     p  ON p.id   = a.posto_id
LEFT JOIN sgo_funcoes   fn  ON fn.id  = a.funcao_id
LEFT JOIN sgo_prestadoras pr ON pr.id = f.prestadora_id;
