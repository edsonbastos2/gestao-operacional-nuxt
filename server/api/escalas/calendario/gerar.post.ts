import { getUsuarioAutenticado } from '~/server/utils/supabase'

function diasDaCompetencia(competencia: string): Date[] {
  const [ano, mes] = competencia.split('-').map(Number)
  const dias: Date[] = []
  const total = new Date(ano, mes, 0).getDate()
  for (let d = 1; d <= total; d++) dias.push(new Date(ano, mes - 1, d))
  return dias
}

export default defineEventHandler(async (event) => {
  const { me, supabase } = await getUsuarioAutenticado(event)
  const { competencia, escala_id, colaborador_ids } = await readBody(event)
  if (!competencia || !escala_id || !colaborador_ids?.length)
    throw createError({ statusCode: 400, message: 'competencia, escala_id e colaborador_ids obrigatórios.' })

  // Busca escala e seus turnos
  const { data: escala } = await supabase.from('sgo_escalas').select('*').eq('id', escala_id).single()
  if (!escala) throw createError({ statusCode: 404, message: 'Escala não encontrada.' })
  const { data: turnos } = await supabase.from('sgo_turnos')
    .select('*').eq('escala_id', escala_id).eq('status', 'ativo')

  // Busca feriados do mês/ano
  const [ano, mes] = competencia.split('-')
  const { data: feriados } = await supabase.from('sgo_feriados')
    .select('data').like('data', `${ano}-${mes}-%`)
  const datasFeriado = new Set((feriados ?? []).map(f => f.data))

  const dias = diasDaCompetencia(competencia)
  const rows: any[] = []
  let sobrescritos = 0; let novos = 0

  for (const colab_id of colaborador_ids) {
    for (const dia of dias) {
      const dataStr = dia.toISOString().split('T')[0]
      const diaSemana = dia.getDay() // 0=dom,6=sab
      const ehFeriado = datasFeriado.has(dataStr)

      // Encontra turno para este dia da semana
      const turno = (turnos ?? []).find(t => t.dias_semana?.includes(diaSemana))
      const tipo_dia = ehFeriado ? 'feriado' : (turno ? 'normal' : 'folga')

      rows.push({
        colaborador_id: colab_id, escala_id,
        turno_id: turno?.id ?? null,
        competencia, data: dataStr, tipo_dia,
        hora_inicio: turno?.hora_inicio ?? null,
        hora_fim: turno?.hora_fim ?? null,
        ajustado: false, created_by: me.id, updated_by: me.id,
      })
    }
  }

  // Upsert — sobrescreve dias já gerados (não ajustados)
  const { data: existentes } = await supabase.from('sgo_calendario')
    .select('id,colaborador_id,data,ajustado')
    .eq('competencia', competencia)
    .in('colaborador_id', colaborador_ids)

  const ajustados = new Set((existentes ?? []).filter(e => e.ajustado).map(e => `${e.colaborador_id}:${e.data}`))
  const rowsParaInserir = rows.filter(r => !ajustados.has(`${r.colaborador_id}:${r.data}`))
  novos = rowsParaInserir.length
  sobrescritos = rows.length - rowsParaInserir.length

  // Delete não ajustados e re-insere
  const idsExistentes = (existentes ?? []).filter(e => !e.ajustado).map(e => e.id)
  if (idsExistentes.length) await supabase.from('sgo_calendario').delete().in('id', idsExistentes)
  if (rowsParaInserir.length) await supabase.from('sgo_calendario').insert(rowsParaInserir)

  return { gerados: novos, ignorados_ajustados: sobrescritos, competencia, colaboradores: colaborador_ids.length }
})
