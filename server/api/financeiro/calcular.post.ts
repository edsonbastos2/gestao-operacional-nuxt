import { getUsuarioAutenticado } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event, 'ti_admin')
  const { competencia_id } = await readBody(event)
  if (!competencia_id) throw createError({ statusCode: 400, message: 'competencia_id obrigatório.' })

  // Busca competência
  const { data: comp } = await supabase
    .from('sgo_competencias').select('*').eq('id', competencia_id).single()
  if (!comp) throw createError({ statusCode: 404, message: 'Competência não encontrada.' })

  const { data_inicio, data_fim } = comp

  // Dias úteis do mês
  const inicio = new Date(data_inicio + 'T12:00:00')
  const fim    = new Date(data_fim    + 'T12:00:00')
  let dias_uteis = 0
  for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) dias_uteis++
  }

  // Busca alocações ativas
  const { data: alocacoes } = await supabase
    .from('sgo_alocacoes')
    .select('id, colaborador_id, posto_id, funcao_id, sgo_postos(tomador_id, sgo_tomadores(prestadora_id))')
    .eq('status', 'ativo')

  if (!alocacoes?.length) return { calculados: 0, erros: [] }

  const registros = []
  const erros: any[] = []

  for (const aloc of alocacoes) {
    const col_id = aloc.colaborador_id

    // Busca salário vigente
    const { data: salarioVig } = await supabase
      .from('sgo_historico_salarial')
      .select('salario')
      .eq('colaborador_id', col_id)
      .lte('vigencia_inicio', data_fim)
      .or(`vigencia_fim.is.null,vigencia_fim.gte.${data_inicio}`)
      .order('vigencia_inicio', { ascending: false })
      .limit(1)
      .single()

    if (!salarioVig) {
      erros.push({ colaborador_id: col_id, motivo: 'Sem salário cadastrado.' })
      continue
    }

    const salario_base = Number(salarioVig.salario)
    const hora_normal  = salario_base / 220

    // Faltas injustificadas
    const { data: faltas } = await supabase
      .from('sgo_faltas').select('tipo, horas_falta')
      .eq('colaborador_id', col_id).eq('alocacao_id', aloc.id)
      .eq('status', 'registrada')
      .gte('data_falta', data_inicio).lte('data_falta', data_fim)

    const faltasData = faltas ?? []
    const qtd_faltas_inj = faltasData.filter((f: any) => f.tipo === 'injustificada').length
    const horas_atraso   = faltasData
      .filter((f: any) => f.tipo === 'atraso_parcial')
      .reduce((s: number, f: any) => s + Number(f.horas_falta), 0)

    // Horas extras aprovadas
    const { data: extras } = await supabase
      .from('sgo_extras').select('horas')
      .eq('colaborador_id', col_id).eq('alocacao_id', aloc.id)
      .eq('status', 'aprovado_rh')
      .gte('data_extra', data_inicio).lte('data_extra', data_fim)

    const horas_extras = (extras ?? []).reduce((s: number, e: any) => s + Number(e.horas), 0)

    // Feriados trabalhados com pagamento (outras escalas)
    const { data: feriados } = await supabase
      .from('sgo_feriados_trabalhados').select('horas_trabalhadas, gera_pagamento')
      .eq('colaborador_id', col_id).eq('alocacao_id', aloc.id)
      .eq('gera_pagamento', true)
      .gte('data_trabalho', data_inicio).lte('data_trabalho', data_fim)

    const feriadosData    = feriados ?? []
    const horas_feriados  = feriadosData.reduce((s: number, f: any) => s + Number(f.horas_trabalhadas), 0)
    const qtd_feriados    = feriadosData.length

    // ── Cálculos ─────────────────────────────────────────────
    const dias_trabalhados = Math.max(0, dias_uteis - qtd_faltas_inj)
    const salario_diario   = salario_base / dias_uteis

    // Proventos
    const salario_bruto        = salario_diario * dias_trabalhados
    const valor_horas_extras   = hora_normal * 1.5 * horas_extras
    const valor_feriados       = hora_normal * 2   * horas_feriados   // feriado = dobro
    const total_proventos      = salario_bruto + valor_horas_extras + valor_feriados

    // Descontos
    const desconto_faltas      = salario_diario * qtd_faltas_inj
    const desconto_atraso      = hora_normal * horas_atraso
    const desconto_vt          = salario_base * 0.06               // 6% CLT
    const total_descontos      = desconto_faltas + desconto_atraso + desconto_vt

    const salario_liquido      = total_proventos - total_descontos
    const prestadora_id        = (aloc as any).sgo_postos?.sgo_tomadores?.prestadora_id ?? null

    registros.push({
      competencia_id,
      colaborador_id:  col_id,
      alocacao_id:     aloc.id,
      prestadora_id,
      salario_base,
      dias_uteis,
      dias_trabalhados,
      hora_normal:     Number(hora_normal.toFixed(4)),
      salario_bruto:   Number(salario_bruto.toFixed(2)),
      valor_horas_extras: Number(valor_horas_extras.toFixed(2)),
      valor_feriados:  Number(valor_feriados.toFixed(2)),
      total_proventos: Number(total_proventos.toFixed(2)),
      desconto_faltas: Number((desconto_faltas + desconto_atraso).toFixed(2)),
      desconto_vt:     Number(desconto_vt.toFixed(2)),
      total_descontos: Number(total_descontos.toFixed(2)),
      salario_liquido: Number(salario_liquido.toFixed(2)),
      qtd_faltas_injustificadas: qtd_faltas_inj,
      horas_extras_pagas:        Number(horas_extras.toFixed(2)),
      feriados_com_adicional:    qtd_feriados,
      horas_feriados_pagas:      Number(horas_feriados.toFixed(2)),
      status: 'calculado',
      gerado_por: me.id,
    })
  }

  // Remove cálculo anterior e insere novo
  await supabase.from('sgo_folha_pagamento').delete().eq('competencia_id', competencia_id)
  for (let i = 0; i < registros.length; i += 50) {
    await supabase.from('sgo_folha_pagamento').insert(registros.slice(i, i + 50))
  }

  return {
    calculados: registros.length,
    erros,
    total_liquido: registros.reduce((s, r) => s + r.salario_liquido, 0).toFixed(2),
  }
})
