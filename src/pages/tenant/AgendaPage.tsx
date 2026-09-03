import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Plus, Search, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { TenantPage, localDateKey, localDateTimeToUtc, utcToLocalInput, formatZoned, BR_TIMEZONE } from '../shared'

type Appointment = any

export function AgendaPage() {
  const { activeCompany } = useTenant()
  const tz = activeCompany?.timezone || BR_TIMEZONE
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month' | 'list'>('month')
  const [items, setItems] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [professionalFilter, setProfessionalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [patientId, setPatientId] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState('60')
  const [appointmentType, setAppointmentType] = useState('Consulta')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('scheduled')

  const dayKey = localDateKey(currentDate, tz)

  const range = useMemo(() => {
    if (view === 'day' || view === 'list') return { start: dayKey, end: dayKey }
    if (view === 'week') {
      const start = new Date(currentDate)
      const weekday = start.getDay() || 7
      start.setDate(start.getDate() - weekday + 1)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return { start: localDateKey(start, tz), end: localDateKey(end, tz) }
    }
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    return { start: localDateKey(start, tz), end: localDateKey(end, tz) }
  }, [currentDate, dayKey, tz, view])

  async function load() {
    if (!supabase || !activeCompany) return
    setLoading(true)
    setError('')
    const from = localDateTimeToUtc(range.start + 'T00:00', tz)
    const endLocal = new Date(range.end + 'T12:00:00')
    endLocal.setDate(endLocal.getDate() + 1)
    const to = localDateTimeToUtc(localDateKey(endLocal, tz) + 'T00:00', tz)

    const [appointments, patientRows, professionalRows] = await Promise.all([
      supabase.from('appointments').select('*,patients(full_name),professionals(name)').eq('company_id', activeCompany.id).gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at'),
      supabase.from('patients').select('id,full_name').eq('company_id', activeCompany.id).eq('status', 'active').order('full_name'),
      supabase.from('professionals').select('id,name').eq('company_id', activeCompany.id).eq('status', 'active').order('name'),
    ])

    if (appointments.error) setError(appointments.error.message)
    else setItems(appointments.data || [])
    if (!patientRows.error) setPatients(patientRows.data || [])
    if (!professionalRows.error) setProfessionals(professionalRows.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeCompany?.id, range.start, range.end, tz])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(item => {
      const patient = String(item.patients?.full_name || '').toLowerCase()
      const professional = String(item.professionals?.name || '').toLowerCase()
      return (!q || patient.includes(q) || professional.includes(q))
        && (!professionalFilter || item.professional_id === professionalFilter)
        && (!statusFilter || item.status === statusFilter)
    })
  }, [items, professionalFilter, search, statusFilter])

  function openNew(selectedDate = dayKey) {
    setEditing(null)
    setPatientId('')
    setProfessionalId('')
    setDate(selectedDate)
    setTime('09:00')
    setDuration('60')
    setAppointmentType('Consulta')
    setNotes('')
    setStatus('scheduled')
    setError('')
    setModalOpen(true)
  }

  function openEdit(item: Appointment) {
    const local = utcToLocalInput(item.starts_at, tz)
    setEditing(item)
    setPatientId(item.patient_id || '')
    setProfessionalId(item.professional_id || '')
    setDate(local.date)
    setTime(local.time)
    setDuration(String(Math.max(15, Math.round((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60000))))
    setAppointmentType(item.appointment_type || 'Consulta')
    setNotes(item.notes || '')
    setStatus(item.status || 'scheduled')
    setError('')
    setModalOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !activeCompany) return
    if (!patientId || !professionalId || !date || !time) {
      setError('Preencha paciente, profissional, data e horário.')
      return
    }
    const minutes = Number(duration)
    const start = localDateTimeToUtc(date + 'T' + time, tz)
    if (!Number.isFinite(minutes) || minutes < 15 || minutes > 480 || Number.isNaN(start.getTime())) {
      setError('Data, horário ou duração inválidos.')
      return
    }
    const end = new Date(start.getTime() + minutes * 60000)
    const payload = {
      patient_id: patientId,
      professional_id: professionalId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      appointment_type: appointmentType,
      notes: notes.trim() || null,
      status,
    }
    const result = editing
      ? await supabase.from('appointments').update(payload).eq('id', editing.id).eq('company_id', activeCompany.id)
      : await supabase.from('appointments').insert({ company_id: activeCompany.id, ...payload })
    if (result.error) setError(result.error.message)
    else { setModalOpen(false); await load() }
  }

  async function setAppointmentStatus(id: string, nextStatus: string) {
    if (!supabase || !activeCompany) return
    const result = await supabase.from('appointments').update({ status: nextStatus }).eq('id', id).eq('company_id', activeCompany.id)
    if (result.error) setError(result.error.message)
    else await load()
  }

  function shift(delta: number) {
    setCurrentDate(previous => {
      const next = new Date(previous)
      if (view === 'day' || view === 'list') next.setDate(next.getDate() + delta)
      else if (view === 'week') next.setDate(next.getDate() + delta * 7)
      else next.setMonth(next.getMonth() + delta)
      return next
    })
  }

  const title = view === 'month'
    ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const holidays = useMemo(() => {
    const year = currentDate.getFullYear()
    const easter = (() => {
      const a = year % 19
      const b = Math.floor(year / 100)
      const c = year % 100
      const d = Math.floor(b / 4)
      const e = b % 4
      const f = Math.floor((b + 8) / 25)
      const g = Math.floor((b - f + 1) / 3)
      const h = (19 * a + b - d - g + 15) % 30
      const i = Math.floor(c / 4)
      const k = c % 4
      const l = (32 + 2 * e + 2 * i - h - k) % 7
      const m = Math.floor((a + 11 * h + 22 * l) / 451)
      const month = Math.floor((h + l - 7 * m + 114) / 31)
      const day = ((h + l - 7 * m + 114) % 31) + 1
      return new Date(year, month - 1, day)
    })()
    const addDays = (date: Date, days: number) => {
      const next = new Date(date)
      next.setDate(next.getDate() + days)
      return next
    }
    const fixed: Record<string, string> = {
      [year + '-01-01']: 'Confraternização Universal',
      [year + '-04-21']: 'Tiradentes',
      [year + '-05-01']: 'Dia do Trabalho',
      [year + '-09-07']: 'Independência do Brasil',
      [year + '-10-12']: 'Nossa Senhora Aparecida',
      [year + '-11-02']: 'Finados',
      [year + '-11-15']: 'Proclamação da República',
      [year + '-11-20']: 'Dia da Consciência Negra',
      [year + '-12-25']: 'Natal',
    }
    const result = { ...fixed }
    result[localDateKey(addDays(easter, -48), tz)] = 'Carnaval'
    result[localDateKey(addDays(easter, -47), tz)] = 'Carnaval'
    result[localDateKey(addDays(easter, -2), tz)] = 'Sexta-feira Santa'
    result[localDateKey(addDays(easter, 60), tz)] = 'Corpus Christi'
    return result
  }, [currentDate, tz])

  const monthDays = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const start = new Date(first)
    const mondayOffset = (first.getDay() + 6) % 7
    start.setDate(first.getDate() - mondayOffset)
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      return day
    })
  }, [currentDate])

  function monthCalendar() {
    return <div className="agenda-month-full">
      <div className="month-weekdays">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => <b key={day}>{day}</b>)}</div>
      <div className="month-grid">
        {monthDays.map(day => {
          const key = localDateKey(day, tz)
          const dayItems = filtered.filter(item => localDateKey(new Date(item.starts_at), tz) === key)
          const holiday = holidays[key]
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = localDateKey(new Date(), tz) === key
          return <button type="button" key={key} className={`month-cell ${isCurrentMonth ? '' : 'muted'} ${isToday ? 'selected' : ''} ${holiday ? 'holiday' : ''}`} onClick={() => openNew(key)}>
            <div className="month-cell-head">
              <strong>{day.getDate()}</strong>
              {dayItems.length > 0 && <span className="month-count">{dayItems.length}</span>}
            </div>
            {holiday && <small className="month-holiday">{holiday}</small>}
            <div className="month-events">
              {dayItems.slice(0, 3).map(item => <div key={item.id} className="month-event" onClick={e => { e.stopPropagation(); openEdit(item) }}>
                <b>{formatZoned(item.starts_at, tz, { hour: '2-digit', minute: '2-digit' })}</b> {item.patients?.full_name || 'Paciente'}
              </div>)}
              {dayItems.length > 3 && <small>+{dayItems.length - 3} atendimento(s)</small>}
            </div>
          </button>
        })}
      </div>
    </div>
  }

  function appointmentCard(item: Appointment) {
    return <div className="appointment-card" key={item.id} onClick={() => openEdit(item)}>
      <div>
        <b>{formatZoned(item.starts_at, tz, { hour: '2-digit', minute: '2-digit' })} · {item.patients?.full_name || 'Paciente'}</b>
        <small>{item.professionals?.name || 'Profissional'} · {item.appointment_type || 'Consulta'} · {item.status || 'scheduled'}</small>
      </div>
      <span>
        {item.status !== 'confirmed' && item.status !== 'completed' && <button type="button" className="appointment-action confirm" onClick={e => { e.stopPropagation(); setAppointmentStatus(item.id, 'confirmed') }}>Confirmar</button>}
        {item.status === 'confirmed' && <button type="button" className="appointment-action confirm" onClick={e => { e.stopPropagation(); setAppointmentStatus(item.id, 'completed') }}>Concluir</button>}
        {item.status !== 'cancelled' && item.status !== 'completed' && <button type="button" className="appointment-action cancel" onClick={e => { e.stopPropagation(); setAppointmentStatus(item.id, 'cancelled') }}>Cancelar</button>}
      </span>
    </div>
  }

  return <TenantPage
    title="Agenda"
    description="Calendário de atendimentos do consultório."
    action={<button className="hero-btn" onClick={() => openNew()}><Plus size={16} /> Novo atendimento</button>}
  >
    <section className="panel">
      <div className="agenda-toolbar">
        <div className="agenda-nav">
          <button type="button" className="agenda-today" onClick={() => setCurrentDate(new Date())}>Hoje</button>
          <button type="button" className="agenda-nav-btn" onClick={() => shift(-1)}><ArrowLeft size={18} /></button>
          <button type="button" className="agenda-nav-btn" onClick={() => shift(1)}><ArrowRight size={18} /></button>
          <h2>{title}</h2>
        </div>
        <div className="agenda-view-toggle">
          {(['day', 'week', 'month', 'list'] as const).map(option => <button key={option} type="button" className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option === 'day' ? 'Dia' : option === 'week' ? 'Semana' : option === 'month' ? 'Mês' : 'Lista'}</button>)}
        </div>
      </div>
      <div className="agenda-filters">
        <div className="search-wrap"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente ou profissional..." /></div>
        <select value={professionalFilter} onChange={e => setProfessionalFilter(e.target.value)}><option value="">Todos os profissionais</option>{professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos os status</option><option value="scheduled">Agendados</option><option value="confirmed">Confirmados</option><option value="completed">Realizados</option><option value="cancelled">Cancelados</option></select>
      </div>
      {error && <div className="form-error">{error}</div>}
      {loading ? <div className="empty-box">Carregando agenda...</div> : view === 'month' ? monthCalendar() : <div>{filtered.length ? filtered.map(appointmentCard) : <div className="empty-box">Nenhum atendimento encontrado.</div>}</div>}
    </section>

    {modalOpen && <div className="modal-backdrop">
      <form className="modal panel" onSubmit={save}>
        <div className="head">
          <div><h2>{editing ? 'Editar atendimento' : 'Novo atendimento'}</h2><p>Preencha os dados do agendamento.</p></div>
          <button type="button" className="icon-btn" onClick={() => setModalOpen(false)}><XCircle size={18} /></button>
        </div>
        <div className="form-grid">
          <label>Paciente*<select required value={patientId} onChange={e => setPatientId(e.target.value)}><option value="">Selecione</option>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
          <label>Profissional*<select required value={professionalId} onChange={e => setProfessionalId(e.target.value)}><option value="">Selecione</option>{professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Data*<input type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
          <label>Horário*<input type="time" required value={time} onChange={e => setTime(e.target.value)} /></label>
          <label>Duração<select value={duration} onChange={e => setDuration(e.target.value)}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></label>
          <label>Tipo<input value={appointmentType} onChange={e => setAppointmentType(e.target.value)} /></label>
          <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option></select></label>
          <label style={{ gridColumn: '1 / -1' }}>Observações<textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div><button className="hero-btn">{editing ? 'Salvar alterações' : 'Criar atendimento'}</button><button type="button" className="back-link" onClick={() => setModalOpen(false)}>Cancelar</button></div>
      </form>
    </div>}
  </TenantPage>
}
