-- SGO — Migration 009: Fechamento de Competência

-- ── ENUMs ────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE status_competencia AS ENUM (
  'aberta','fechada','reaberta'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Competências ──────────────────────────────────────────────
-- A tabela sgo_competencias já existe (migration base), vamos expandir
-- Adiciona colunas de controle de fechamento se não existirem
ALTER TABLE sgo_competencias
  ADD COLUMN IF NOT EXISTS data_inicio       DATE,
  ADD COLUMN IF NOT EXISTS data_fim          DATE,
  ADD COLUMN IF NOT EXISTS status_fechamento status_competencia NOT NULL DEFAULT 'aberta',
  ADD COLUMN IF NOT EXISTS fechado_por       UUID REFERENCES sgo_usuarios(id),
  ADD COLUMN IF NOT EXISTS fechado_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reaberto_por      UUID REFERENCES sgo_usuarios(id),
  ADD COLUMN IF NOT EXISTS reaberto_em       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS justificativa_reabertura TEXT,
  ADD COLUMN IF NOT EXISTS total_colaboradores INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_faltas       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_extras_horas NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pendencias_no_fechamento JSONB;

-- Preenche data_inicio e data_fim para competências existentes
UPDATE sgo_competencias
SET
  data_inicio = make_date(ano, mes, 1),
  data_fim    = (make_date(ano, mes, 1) + INTERVAL '1 month - 1 day')::DATE
WHERE data_inicio IS NULL;

-- Torna obrigatório após preencher
ALTER TABLE sgo_competencias
  ALTER COLUMN data_inicio SET NOT NULL,
  ALTER COLUMN data_fim    SET NOT NULL;

-- ── Espelho de fechamento por colaborador ──────────────────────
-- Um registro por colaborador por competência — snapshot no momento do fechamento
CREATE TABLE IF NOT EXISTS sgo_espelho_competencia (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia_id    UUID NOT NULL REFERENCES sgo_competencias(id),
  colaborador_id    UUID NOT NULL REFERENCES sgo_colaboradores(id),
  alocacao_id       UUID REFERENCES sgo_alocacoes(id),
  prestadora_id     UUID REFERENCES sgo_prestadoras(id),
  posto_id          UUID REFERENCES sgo_postos(id),
  funcao_id         UUID REFERENCES sgo_funcoes(id),
  -- Presença
  dias_uteis        INTEGER NOT NULL DEFAULT 0,
  dias_trabalhados  INTEGER NOT NULL DEFAULT 0,
  -- Faltas consolidadas
  faltas_injustificadas  INTEGER DEFAULT 0,
  faltas_justificadas    INTEGER DEFAULT 0,
  faltas_abonadas        INTEGER DEFAULT 0,
  faltas_suspensao       INTEGER DEFAULT 0,
  horas_atraso           NUMERIC(6,2) DEFAULT 0,
  -- Extras
  horas_extras_aprovadas NUMERIC(6,2) DEFAULT 0,
  -- Feriados
  feriados_trabalhados        INTEGER DEFAULT 0,
  feriados_trabalhados_horas  NUMERIC(6,2) DEFAULT 0,
  feriados_geram_pagamento    INTEGER DEFAULT 0,
  -- Ocorrências
  ocorrencias_disciplinares INTEGER DEFAULT 0,
  ocorrencias_elogios       INTEGER DEFAULT 0,
  -- Benefícios (snapshot dos benefícios ativos no fechamento)
  beneficios JSONB DEFAULT '[]',
  -- Metadados
  gerado_em   TIMESTAMPTZ DEFAULT NOW(),
  gerado_por  UUID REFERENCES sgo_usuarios(id),
  UNIQUE(competencia_id, colaborador_id, alocacao_id)
);
CREATE INDEX IF NOT EXISTS idx_espelho_competencia ON sgo_espelho_competencia(competencia_id);
CREATE INDEX IF NOT EXISTS idx_espelho_colaborador ON sgo_espelho_competencia(colaborador_id);

-- ── View pendências ────────────────────────────────────────────
-- Usada antes do fechamento para alertar sobre itens incompletos
CREATE OR REPLACE VIEW vw_pendencias_competencia AS
SELECT
  c.id AS competencia_id,
  c.ano, c.mes, c.data_inicio, c.data_fim,
  -- Extras pendentes de aprovação
  (SELECT COUNT(*) FROM sgo_extras e
   WHERE e.data_extra BETWEEN c.data_inicio AND c.data_fim
   AND e.status = 'pendente') AS extras_pendentes,
  -- Extras aprovados pela operação aguardando RH
  (SELECT COUNT(*) FROM sgo_extras e
   WHERE e.data_extra BETWEEN c.data_inicio AND c.data_fim
   AND e.status = 'aprovado_operacao') AS extras_aguardando_rh,
  -- Faltas injustificadas (sem documento)
  (SELECT COUNT(*) FROM sgo_faltas f
   WHERE f.data_falta BETWEEN c.data_inicio AND c.data_fim
   AND f.tipo = 'injustificada' AND f.status = 'registrada') AS faltas_injustificadas,
  -- Colaboradores sem alocação ativa no período
  (SELECT COUNT(DISTINCT col.id) FROM sgo_colaboradores col
   WHERE col.status = 'ativo'
   AND NOT EXISTS (
     SELECT 1 FROM sgo_alocacoes a
     WHERE a.colaborador_id = col.id AND a.status = 'ativo'
   )) AS colaboradores_sem_alocacao
FROM sgo_competencias c;

-- ── View espelho resumida ──────────────────────────────────────
CREATE OR REPLACE VIEW vw_espelho_resumo AS
SELECT
  e.*,
  c.nome       AS colaborador_nome,
  c.matricula  AS colaborador_matricula,
  p.nome       AS posto_nome,
  f.nome       AS funcao_nome,
  pr.razao_social AS prestadora_nome,
  comp.ano, comp.mes
FROM sgo_espelho_competencia e
JOIN sgo_colaboradores  c    ON c.id   = e.colaborador_id
JOIN sgo_competencias   comp ON comp.id = e.competencia_id
LEFT JOIN sgo_postos    p    ON p.id   = e.posto_id
LEFT JOIN sgo_funcoes   f    ON f.id   = e.funcao_id
LEFT JOIN sgo_prestadoras pr ON pr.id  = e.prestadora_id;

