-- SGO — Migration 006: Vincula alocações às vagas (idempotente)

-- Adiciona vaga_id em sgo_alocacoes (se ainda não existir)
DO $$ BEGIN
  ALTER TABLE sgo_alocacoes ADD COLUMN vaga_id UUID REFERENCES sgo_vagas(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Índice para consultas de ocupação
CREATE INDEX IF NOT EXISTS idx_alocacoes_vaga ON sgo_alocacoes(vaga_id);

-- View de ocupação de vagas (útil para relatórios e validação)
CREATE OR REPLACE VIEW vw_ocupacao_vagas AS
SELECT
  v.id            AS vaga_id,
  v.posto_id,
  v.funcao_id,
  v.quantidade    AS vagas_contratadas,
  p.nome          AS posto_nome,
  f.nome          AS funcao_nome,
  t.id            AS tomador_id,
  t.razao_social  AS tomador_nome,
  pr.id           AS prestadora_id,
  pr.razao_social AS prestadora_nome,
  COUNT(a.id) FILTER (WHERE a.status = 'ativo') AS alocados,
  v.quantidade - COUNT(a.id) FILTER (WHERE a.status = 'ativo') AS saldo
FROM sgo_vagas v
JOIN sgo_postos   p  ON p.id  = v.posto_id
JOIN sgo_funcoes  f  ON f.id  = v.funcao_id
JOIN sgo_tomadores t ON t.id  = p.tomador_id
JOIN sgo_prestadoras pr ON pr.id = t.prestadora_id
LEFT JOIN sgo_alocacoes a ON a.vaga_id = v.id
GROUP BY v.id, v.posto_id, v.funcao_id, v.quantidade,
         p.nome, f.nome, t.id, t.razao_social, pr.id, pr.razao_social;
