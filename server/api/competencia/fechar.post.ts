import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, 'ti_admin')
  const { competencia_id, forcar } = await readBody(event)
  if (!competencia_id) throw createError({ statusCode: 400, message: 'competencia_id obrigatório.' })

  const { data: comp } = await supabase
    .from('sgo_competencias').select('*').eq('id', competencia_id).single()
  if (!comp) throw createError({ statusCode: 404, message: 'Competência não encontrada.' })
  if (comp.status_fechamento === 'fechada')
    throw createError({ statusCode: 422, message: 'Competência já está fechada.' })

  // Verifica pendências
  const extras_pend = await supabase.from('sgo_extras').select('id', { count: 'exact', head: true })
    .gte('data_extra', comp.data_inicio).lte('data_extra', comp.data_fim)
    .in('status', ['pendente', 'aprovado_operacao'])
  const faltas_inj = await supabase.from('sgo_faltas').select('id', { count: 'exact', head: true })
    .gte('data_falta', comp.data_inicio).lte('data_falta', comp.data_fim)
    .eq('tipo', 'injustificada').eq('status', 'registrada')

  const pendencias = {
    extras_pendentes: extras_pend.count ?? 0,
    faltas_injustificadas: faltas_inj.count ?? 0,
  }
  const tem_pendencias = pendencias.extras_pendentes + pendencias.faltas_injustificadas > 0

  if (tem_pendencias && !forcar)
    return { pendencias, requer_confirmacao: true }

  // Gera espelho para todos os colaboradores ativos com alocação no período
  const espelhoGerado = await gerarEspelho(supabase, comp, me.id)

  // Fecha a competência
  const { data, error } = await supabase.from('sgo_competencias').update({
    status_fechamento: 'fechada',
    fechado_por:  me.id,
    fechado_em:   new Date().toISOString(),
    total_colaboradores: espelhoGerado.total,
    total_faltas:        espelhoGerado.total_faltas,
    total_extras_horas:  espelhoGerado.total_extras,
    pendencias_no_fechamento: tem_pendencias ? pendencias : null,
  }).eq('id', competencia_id).select().single()
  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data, espelho: espelhoGerado, fechado: true }
})

async function gerarEspelho(supabase: any, comp: any, userId: string) {
  const { data_inicio, data_fim, id: competencia_id } = comp

  // Busca todas as alocações ativas no período
  const { data: alocacoes } = await supabase
    .from('sgo_alocacoes')
    .select('id, colaborador_id, posto_id, funcao_id, sgo_postos(tomador_id, sgo_tomadores(prestadora_id))')
    .eq('status', 'ativo')

  if (!alocacoes?.length) return { total: 0, total_faltas: 0, total_extras: 0 }

  // Dias úteis no mês (aproximação: dias corridos - fins de semana)
  const inicio = new Date(data_inicio + 'T12:00:00')
  const fim    = new Date(data_fim    + 'T12:00:00')
  let dias_uteis = 0
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) dias_uteis++
  }

  let total_faltas = 0
  let total_extras = 0
  const registros = []

  for (const aloc of alocacoes) {
    const col_id  = aloc.colaborador_id
    const aloc_id = aloc.id
    const prestadora_id = aloc.sgo_postos?.sgo_tomadores?.prestadora_id ?? null

    const [faltas, extras, feriados, ocorr, beneficios] = await Promise.all([
      supabase.from('sgo_faltas').select('tipo, horas_falta').eq('colaborador_id', col_id)
        .eq('alocacao_id', aloc_id).eq('status', 'registrada')
        .gte('data_falta', data_inicio).lte('data_falta', data_fim),
      supabase.from('sgo_extras').select('horas').eq('colaborador_id', col_id)
        .eq('alocacao_id', aloc_id).eq('status', 'aprovado_rh')
        .gte('data_extra', data_inicio).lte('data_extra', data_fim),
      supabase.from('sgo_feriados_trabalhados').select('horas_trabalhadas, gera_pagamento')
        .eq('colaborador_id', col_id).eq('alocacao_id', aloc_id)
        .gte('data_trabalho', data_inicio).lte('data_trabalho', data_fim),
      supabase.from('sgo_ocorrencias').select('tipo').eq('colaborador_id', col_id)
        .gte('data_ocorrencia', data_inicio).lte('data_ocorrencia', data_fim),
      supabase.from('vw_colaborador_beneficios').select('tipo, beneficio_nome, valor_unitario, custeio_saude')
        .eq('colaborador_id', col_id).eq('alocacao_id', aloc_id).eq('status', 'ativo'),
    ])

    const faltasData   = faltas.data   ?? []
    const extrasData   = extras.data   ?? []
    const feriadosData = feriados.data ?? []
    const ocorrData    = ocorr.data    ?? []
    const benefData    = beneficios.data ?? []

    const f_inj  = faltasData.filter((f: any) => f.tipo === 'injustificada').length
    const f_just = faltasData.filter((f: any) => f.tipo === 'justificada').length
    const f_abon = faltasData.filter((f: any) => f.tipo === 'abonada').length
    const f_susp = faltasData.filter((f: any) => f.tipo === 'suspensao_disciplinar').length
    const h_atr  = faltasData.filter((f: any) => f.tipo === 'atraso_parcial').reduce((s: number, f: any) => s + Number(f.horas_falta), 0)
    const total_faltas_colab = f_inj + f_just + f_abon + f_susp
    const h_extras = extrasData.reduce((s: number, e: any) => s + Number(e.horas), 0)
    const fer_horas = feriadosData.reduce((s: number, f: any) => s + Number(f.horas_trabalhadas), 0)
    const fer_pag   = feriadosData.filter((f: any) => f.gera_pagamento).length
    const ocorr_disc  = ocorrData.filter((o: any) => ['advertencia_verbal','advertencia_escrita','suspensao','insubordinacao','abandono_posto'].includes(o.tipo)).length
    const ocorr_elogio = ocorrData.filter((o: any) => o.tipo === 'elogio').length
    const dias_trab = dias_uteis - total_faltas_colab

    total_faltas += total_faltas_colab
    total_extras += h_extras

    registros.push({
      competencia_id,
      colaborador_id:  col_id,
      alocacao_id:     aloc_id,
      prestadora_id,
      posto_id:        aloc.posto_id,
      funcao_id:       aloc.funcao_id,
      dias_uteis,
      dias_trabalhados: Math.max(0, dias_trab),
      faltas_injustificadas:  f_inj,
      faltas_justificadas:    f_just,
      faltas_abonadas:        f_abon,
      faltas_suspensao:       f_susp,
      horas_atraso:           h_atr,
      horas_extras_aprovadas: h_extras,
      feriados_trabalhados:       feriadosData.length,
      feriados_trabalhados_horas: fer_horas,
      feriados_geram_pagamento:   fer_pag,
      ocorrencias_disciplinares:  ocorr_disc,
      ocorrencias_elogios:        ocorr_elogio,
      beneficios: benefData,
      gerado_por: userId,
    })
  }

  // Remove espelho anterior se existir (regeução)
  await supabase.from('sgo_espelho_competencia').delete().eq('competencia_id', competencia_id)

  // Insere em lotes de 50
  for (let i = 0; i < registros.length; i += 50) {
    await supabase.from('sgo_espelho_competencia').insert(registros.slice(i, i + 50))
  }

  return { total: alocacoes.length, total_faltas, total_extras }
}
