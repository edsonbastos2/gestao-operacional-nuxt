-- Migration 002: índices adicionais para o módulo admin
-- (as tabelas já foram criadas na migration 001)

CREATE INDEX IF NOT EXISTS idx_usuarios_nome   ON sgo_usuarios(nome);
CREATE INDEX IF NOT EXISTS idx_usuarios_login  ON sgo_usuarios(login);
CREATE INDEX IF NOT EXISTS idx_cap_usuario     ON sgo_capacidades_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cap_revogada    ON sgo_capacidades_usuario(revogada_em) WHERE revogada_em IS NULL;

-- Política de leitura de capacidades: dono ou admin
CREATE POLICY pol_cap_select ON sgo_capacidades_usuario FOR SELECT USING (
  usuario_id = (SELECT id FROM sgo_usuarios WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil = 'ti_admin')
);
CREATE POLICY pol_cap_write ON sgo_capacidades_usuario FOR ALL USING (
  EXISTS (SELECT 1 FROM sgo_usuarios u WHERE u.auth_user_id = auth.uid() AND u.perfil = 'ti_admin')
);
