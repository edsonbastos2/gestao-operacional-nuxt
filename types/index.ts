// types/index.ts — Todos os tipos do SGO

export type StatusAtivo = 'ativo' | 'inativo'
export type StatusColaborador = 'ativo' | 'inativo' | 'reserva' | 'desligado'
export type FormatoExportacao = 'xlsx' | 'csv' | 'pdf' | 'docx'
export type TipoAcao = 'V' | 'C' | 'E' | 'L' | 'D' | 'A' | 'P' | 'X' | 'AU'

export type PerfilSetor =
  | 'ti_admin'
  | 'operacao'
  | 'rh'
  | 'financeiro'
  | 'controladoria'
  | 'supervisor_externo'

export type CapacidadeCritica =
  | 'aprovar_extras'
  | 'cancelar_excluir'
  | 'reabrir_competencia'
  | 'ajustar_calendario'
  | 'parametrizar_critico'

export interface SessaoUsuario {
  id: string
  nome: string
  email: string
  perfil: PerfilSetor
  capacidades: CapacidadeCritica[]
  primeiro_acesso: boolean
}

export interface EntidadeBase {
  id: string
  created_at: string
  updated_at: string
  status: StatusAtivo
  cancelled_at?: string | null
  cancelled_by?: string | null
  cancellation_reason?: string | null
}

export interface Competencia {
  id: string
  mes: number
  ano: number
  status_competencia: 'aberta' | 'fechada'
  abertura: string
  fechamento: string
}

export interface PaginacaoResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
