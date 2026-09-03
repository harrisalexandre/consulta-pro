import React, { useEffect, useMemo, useState } from 'react'
import { Activity, Bell, CalendarCheck2, CheckCircle2, CircleAlert, Clock3, Eye, MessageCircle, MoreVertical, Pause, Pencil, Play, Plus, Search, Send, Smile, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'
import { BR_TIMEZONE, formatZoned, TenantPage } from './shared'

type Template = { id: string; name: string; active: boolean; body: string }
type Automation = { id: string; name: string; type: string; advance_minutes: number; channel: string; message_template: string; enabled: boolean }
type Dispatch = { id: string; automation_id: string; appointment_id: string | null; recipient_number: string | null; status: string; scheduled_for: string | null; sent_at: string | null; error_message: string | null; created_at: string }

function iconForTemplate(name: string) {
  const value = name.toLowerCase()
  if (value.includes('confirma')) return CalendarCheck2
  if (value.includes('lembrete')) return Bell
  if (value.includes('hoje')) return Clock3
  if (value.includes('pós')) return Smile
  return MessageCircle
}

function timingLabel(minutes: number, type: string) {
  if (type === 'appointment_confirmation') return 'Envia após o agendamento'
  if (type === 'appointment_followup') return `Envia ${minutes >= 1440 ? `${Math.round(minutes / 1440)} dia(s)` : `${Math.max(1, Math.round(minutes / 60))} hora(s)`} após a consulta`
  if (minutes >= 1440) return `Envia ${Math.round(minutes / 1440)} dia(s) antes da consulta`
  if (minutes >= 60) return `Envia ${Math.round(minutes / 60)} hora(s) antes da consulta`
  return `Envia ${minutes} min antes da consulta`
}

export function AutomationsPage() {
  const { activeCompany } = useTenant()
  const [items, setItems] = useState<Automation[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Automation | null>(null)
  const [deleting, setDeleting] = useState<Automation | null>(null)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('appointment_reminder')
  const [advance, setAdvance] = useState('1440')
  const [templateId, setTemplateId] = useState('')
  const [enabled, setEnabled] = useState(true)

  async function load() {
    if (!supabase || !activeCompany) return
    setLoading(true); setError('')
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [a, t, d] = await Promise.all([
      supabase.from('automations').select('*').eq('company_id', activeCompany.id).order('name'),
      supabase.from('message_templates').select('id,name,active,body').eq('company_id', activeCompany.id).order('name'),
      supabase.from('automation_dispatches').select('id,automation_id,appointment_id,recipient_number,status,scheduled_for,sent_at,error_message,created_at').eq('company_id', activeCompany.id).gte('created_at', since).order('created_at', { ascending: false }).limit(100)
    ])
    if (a.error || t.error || d.error) setError('Não foi possível carregar os dados das automações.')
    setItems(a.data || [])
    setTemplates((t.data || []).filter((x: Template) => x.active))
    setDispatches(d.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [activeCompany?.id])

  const activeCount = items.filter(x => x.enabled).length
  const pausedCount = items.filter(x => !x.enabled).length
  const sentCount = dispatches.filter(x => ['sent', 'completed', 'delivered'].includes(x.status)).length
  const failedCount = dispatches.filter(x => ['failed', 'error'].includes(x.status)).length

  const filtered = useMemo(() => items.filter(item => {
    const text = `${item.name} ${item.message_template}`.toLowerCase()
    return (!search || text.includes(search.toLowerCase())) && (filter === 'all' || (filter === 'active' ? item.enabled : !item.enabled))
  }), [items, search, filter])

  const statsByAutomation = useMemo(() => {
    const map = new Map<string, { sent: number; delivered: number }>()
    dispatches.forEach(d => {
      const current = map.get(d.automation_id) || { sent: 0, delivered: 0 }
      if (['sent', 'completed', 'delivered'].includes(d.status)) current.sent++
      if (['delivered', 'completed'].includes(d.status)) current.delivered++
      map.set(d.automation_id, current)
    })
    return map
  }, [dispatches])

  const selectedTemplate = templates.find(t => t.id === templateId)
  const previewText = String(selectedTemplate?.body || 'Selecione um template para visualizar a mensagem.')
    .replace(/{{nome}}/g, 'Carlos')
    .replace(/{{data}}/g, '04/09/2026')
    .replace(/{{hora}}/g, '10:30')
    .replace(/{{profissional}}/g, 'Dra. Mariana')
    .replace(/{{especialidade}}/g, 'Clínica Geral')
    .replace(/{{empresa}}/g, activeCompany?.name || 'Consultório')

  function newAutomation(template?: Template) {
    setEditing(null); setName(template?.name || '');
    setType(template?.name === 'Confirmação de consulta' ? 'appointment_confirmation' : template?.name === 'Pós-consulta' ? 'appointment_followup' : 'appointment_reminder')
    setAdvance(template?.name === 'Pós-consulta' ? '1440' : '1440'); setTemplateId(template?.id || ''); setEnabled(true); setError(''); setOpen(true)
  }

  function editAutomation(item: Automation) {
    setEditing(item); setName(item.name); setType(item.type || 'appointment_reminder'); setAdvance(String(item.advance_minutes ?? 1440)); setTemplateId(templates.find(t => t.name === item.message_template)?.id || ''); setEnabled(Boolean(item.enabled)); setError(''); setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !activeCompany) return
    if (!name.trim()) { setError('Informe um nome para a automação.'); return }
    if (!selectedTemplate) { setError('Escolha um template de mensagem.'); return }
    setSaving(true); setError('')
    const payload = { company_id: activeCompany.id, name: name.trim(), type, advance_minutes: Math.max(0, Number(advance) || 0), channel: 'whatsapp', message_template: selectedTemplate.name, enabled }
    const result = editing ? await supabase.from('automations').update(payload).eq('id', editing.id).eq('company_id', activeCompany.id) : await supabase.from('automations').insert(payload)
    if (result.error) setError('Não foi possível salvar a automação.')
    else { setOpen(false); setSuccess(editing ? 'Automação atualizada.' : 'Automação criada.'); await load() }
    setSaving(false)
  }

  async function toggle(item: Automation) {
    if (!supabase || !activeCompany) return
    const { error } = await supabase.from('automations').update({ enabled: !item.enabled }).eq('id', item.id).eq('company_id', activeCompany.id)
    if (error) setError('Não foi possível alterar o status da automação.')
    else { setSuccess(item.enabled ? 'Automação pausada.' : 'Automação ativada.'); await load() }
  }

  async function remove() {
    if (!supabase || !activeCompany || !deleting) return
    const { error } = await supabase.from('automations').delete().eq('id', deleting.id).eq('company_id', activeCompany.id)
    if (error) setError('Não foi possível excluir a automação.')
    else { setDeleting(null); setSuccess('Automação excluída.'); await load() }
  }

  return <TenantPage title="Automações" description="Crie lembretes, confirmações e mensagens automáticas para seus pacientes." action={<button className="hero-btn" onClick={() => newAutomation()}><Plus size={16}/> Nova automação</button>}>
    <style>{`
      .auto-page{display:grid;gap:18px}.auto-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.auto-metric{min-height:104px;display:flex;align-items:center;gap:14px}.auto-mi{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#eaf4ef;color:#28785a;flex:0 0 42px}.auto-mi.pause{background:#fff5df;color:#b47a13}.auto-mi.sent{background:#eaf4ef;color:#18784e}.auto-mi.fail{background:#fff0ef;color:#b24e49}.auto-mcopy{display:grid;gap:4px}.auto-mcopy small{font-size:11px;color:#737e78}.auto-mcopy strong{font-size:26px;line-height:1}.auto-mcopy span{font-size:11px;color:#8a938e}.auto-section{background:#fff;border:1px solid #dde5e0;border-radius:15px;overflow:hidden}.auto-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:22px 22px 16px}.auto-head h2{margin:0;font-size:17px}.auto-head p{margin:5px 0 0;color:#7a847e;font-size:12px}.auto-tools{display:flex;gap:8px}.auto-search{height:40px;width:280px;display:flex;align-items:center;gap:8px;border:1px solid #d8e0db;border-radius:9px;padding:0 11px;color:#7a847e}.auto-search input{width:100%;border:0;outline:0;background:transparent;font:13px Inter,system-ui,sans-serif}.auto-filter{height:40px;border:1px solid #d8e0db;border-radius:9px;background:#fff;padding:0 10px;font:600 12px Inter,system-ui,sans-serif;color:#303833}.auto-list{border-top:1px solid #e8eeea}.auto-row{display:grid;grid-template-columns:46px minmax(250px,1fr) 120px 120px 130px;gap:18px;align-items:center;padding:17px 22px;border-bottom:1px solid #edf1ee}.auto-row:last-child{border-bottom:0}.auto-icon{width:42px;height:42px;border-radius:12px;background:#edf6f1;color:#28785a;display:grid;place-items:center}.auto-main{min-width:0;display:grid;gap:5px}.auto-main strong{font-size:14px}.auto-main small{font-size:11px;color:#7a847e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.auto-badges{display:flex;gap:6px;align-items:center}.auto-pill{border-radius:999px;padding:5px 8px;font-size:10px;font-weight:700;background:#eef5f1;color:#28785a}.auto-pill.paused{background:#fff4df;color:#a76f08}.auto-channel{display:inline-flex;align-items:center;gap:5px;border:1px solid #e0e7e3;border-radius:999px;padding:4px 8px;font-size:10px;color:#4f5a54}.auto-stat{display:grid;gap:3px}.auto-stat small{font-size:10px;color:#8a938e}.auto-stat strong{font-size:14px}.auto-actions{display:flex;justify-content:flex-end;gap:6px}.auto-btn{width:36px;height:36px;border:1px solid #dce4df;background:#fff;border-radius:9px;display:grid;place-items:center;cursor:pointer;color:#53615a}.auto-btn:hover{background:#f4f8f5;border-color:#bfcfc6;color:#28694f}.auto-history-table{width:100%;border-collapse:collapse;font-size:11px}.auto-history-table th{text-align:left;color:#7d8781;font-size:10px;font-weight:700;padding:11px 20px;border-bottom:1px solid #e8eeea}.auto-history-table td{padding:13px 20px;border-bottom:1px solid #edf1ee}.auto-status{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eaf5ee;color:#28784f;font-weight:700;font-size:10px}.auto-status.fail{background:#fff0ef;color:#aa4d49}.auto-empty{padding:42px 22px;text-align:center;display:grid;place-items:center;gap:7px;color:#78837d}.auto-empty strong{font-size:15px;color:#29332e}.auto-empty p{font-size:12px;margin:0 0 10px}.auto-success{padding:11px 14px;border-radius:9px;background:#eaf5ee;color:#28784f;font-size:12px}.auto-overlay{position:fixed;inset:0;background:rgba(21,31,26,.38);display:grid;place-items:center;padding:18px;z-index:1000}.auto-builder{width:min(1080px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#f8faf8;border-radius:18px;box-shadow:0 25px 80px rgba(22,42,32,.25)}.auto-builder-head{display:flex;justify-content:space-between;align-items:flex-start;padding:22px 26px;background:#fff;border-bottom:1px solid #e1e8e3}.auto-builder-head h2{margin:4px 0;font-size:21px}.auto-builder-head p{margin:0;color:#7b857f;font-size:12px}.auto-content{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;padding:18px}.auto-card{background:#fff;border:1px solid #dde6e0;border-radius:14px;padding:20px}.auto-card h3{margin:0;font-size:14px}.auto-card>p{margin:5px 0 18px;color:#7b857f;font-size:11px}.auto-field{display:grid;gap:6px;margin-bottom:16px}.auto-field>label{font-size:11px;font-weight:700;color:#39433e}.auto-field input,.auto-field select{height:42px;border:1px solid #d8e0db;border-radius:9px;padding:0 11px;background:#fff;outline:0;font:13px Inter,system-ui,sans-serif}.auto-options{display:grid;gap:8px}.auto-option{display:flex;align-items:center;gap:9px;padding:10px 11px;border:1px solid #e1e7e3;border-radius:9px;cursor:pointer;font-size:12px}.auto-option.selected{border-color:#75a792;background:#f1f8f4}.auto-option input{accent-color:#315f52}.auto-template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.auto-template{display:flex;align-items:flex-start;gap:9px;text-align:left;padding:10px;border:1px solid #dfe6e2;background:#fff;border-radius:10px;cursor:pointer}.auto-template.selected{border-color:#75a792;background:#f2f8f4}.auto-template-icon{width:31px;height:31px;display:grid;place-items:center;border-radius:9px;background:#eaf4ef;color:#28785a;flex:0 0 31px}.auto-template b{display:block;font-size:11px}.auto-template small{display:block;color:#7d8781;font-size:9px;margin-top:3px;line-height:1.35}.auto-preview-phone{border:1px solid #dbe4df;border-radius:16px;overflow:hidden;background:#e8f0eb;margin-top:14px}.auto-phone-head{height:42px;background:#fff;border-bottom:1px solid #e1e7e3;display:flex;align-items:center;gap:7px;padding:0 12px;font-size:11px;font-weight:800}.auto-phone-chat{min-height:270px;padding:18px 12px;display:flex;align-items:flex-end}.auto-bubble{max-width:94%;background:#fff;border-radius:4px 14px 14px 14px;padding:12px 13px;font-size:12px;line-height:1.55;white-space:pre-wrap;box-shadow:0 2px 7px rgba(27,47,37,.06)}.auto-bubble small{display:block;text-align:right;color:#999;font-size:9px;margin-top:5px}.auto-summary{margin-top:12px;padding:11px;border-radius:10px;background:#edf6f1;color:#2b684f;font-size:10px;line-height:1.5}.auto-note{padding:10px 12px;border-radius:9px;background:#f5f8f6;color:#6f7b74;font-size:10px;line-height:1.5}.auto-builder-foot{display:flex;justify-content:flex-end;gap:8px;padding:16px 22px;background:#fff;border-top:1px solid #e1e8e3}.auto-secondary{height:40px;padding:0 14px;border:1px solid #d7dfda;border-radius:9px;background:#fff;font:700 12px Inter,system-ui,sans-serif;cursor:pointer}.auto-primary{height:40px;padding:0 15px;border:0;border-radius:9px;background:#315f52;color:#fff;font:700 12px Inter,system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px}.auto-primary:disabled{opacity:.55;cursor:not-allowed}.auto-danger{background:#a34b47}.auto-modal{width:min(430px,100%)}
      @media(max-width:1000px){.auto-metrics{grid-template-columns:1fr 1fr}.auto-row{grid-template-columns:44px minmax(0,1fr) auto}.auto-stat{display:none}.auto-actions{grid-column:3}.auto-content{grid-template-columns:1fr 330px}}
      @media(max-width:760px){.auto-head{align-items:stretch;flex-direction:column}.auto-tools{width:100%}.auto-search{flex:1;width:auto}.auto-row{grid-template-columns:42px minmax(0,1fr);gap:12px;padding:14px}.auto-actions{grid-column:2;justify-content:flex-start}.auto-content{grid-template-columns:1fr;padding:12px}.auto-preview{order:-1}.auto-template-grid{grid-template-columns:1fr}.auto-builder-head{padding:17px}.auto-builder-foot{position:sticky;bottom:0}.auto-history-table th:nth-child(3),.auto-history-table td:nth-child(3){display:none}}
      @media(max-width:500px){.auto-metrics{gap:8px}.auto-metric{padding:13px;min-height:86px}.auto-mi{width:34px;height:34px;flex-basis:34px}.auto-mcopy strong{font-size:21px}.auto-tools{flex-direction:column}.auto-search,.auto-filter{width:100%}.auto-builder{max-height:calc(100vh - 16px)}.auto-overlay{padding:8px}.auto-card{padding:15px}}
    `}</style>

    <div className="auto-page">
      <div className="auto-metrics">
        <section className="panel auto-metric"><div className="auto-mi"><CheckCircle2 size={21}/></div><div className="auto-mcopy"><small>Ativas</small><strong>{activeCount}</strong><span>Fluxos funcionando</span></div></section>
        <section className="panel auto-metric"><div className="auto-mi pause"><Pause size={20}/></div><div className="auto-mcopy"><small>Pausadas</small><strong>{pausedCount}</strong><span>Aguardando ativação</span></div></section>
        <section className="panel auto-metric"><div className="auto-mi sent"><Send size={20}/></div><div className="auto-mcopy"><small>Enviadas (30 dias)</small><strong>{sentCount}</strong><span>Mensagens enviadas</span></div></section>
        <section className="panel auto-metric"><div className="auto-mi fail"><CircleAlert size={20}/></div><div className="auto-mcopy"><small>Falhas (30 dias)</small><strong>{failedCount}</strong><span>Precisam de atenção</span></div></section>
      </div>

      {success && <div className="auto-success">{success}</div>}
      {error && !open && <div className="form-error">{error}</div>}

      <section className="auto-section">
        <div className="auto-head"><div><h2>Minhas automações</h2><p>Gerencie seus fluxos de mensagens automáticas.</p></div><div className="auto-tools"><div className="auto-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar automações..."/></div><select className="auto-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos</option><option value="active">Ativas</option><option value="paused">Pausadas</option></select></div></div>
        <div className="auto-list">
          {loading ? <div className="auto-empty">Carregando automações...</div> : filtered.length === 0 ? <div className="auto-empty"><MessageCircle size={34}/><strong>{items.length ? 'Nenhuma automação encontrada' : 'Nenhuma automação criada'}</strong><p>{items.length ? 'Tente outro nome ou filtro.' : 'Comece com um lembrete pronto para o seu consultório.'}</p><button className="auto-primary" onClick={()=>newAutomation()}><Plus size={15}/> Criar primeira automação</button></div> : filtered.slice(0, 8).map(item => {
            const Icon = iconForTemplate(item.message_template); const stats = statsByAutomation.get(item.id) || { sent: 0, delivered: 0 }; const rate = stats.sent ? `${Math.round(stats.delivered / stats.sent * 100)}%` : '—'
            return <div className="auto-row" key={item.id}><div className="auto-icon"><Icon size={20}/></div><div className="auto-main"><strong>{item.name}</strong><small>{timingLabel(item.advance_minutes || 0, item.type)}</small><div className="auto-badges"><span className={`auto-pill ${item.enabled ? '' : 'paused'}`}>{item.enabled ? 'Ativa' : 'Pausada'}</span><span className="auto-channel"><MessageCircle size={11}/> WhatsApp</span></div></div><div className="auto-stat"><small>Enviadas (30d)</small><strong>{stats.sent}</strong></div><div className="auto-stat"><small>Taxa de entrega</small><strong>{rate}</strong></div><div className="auto-actions"><button className="auto-btn" title={item.enabled ? 'Pausar' : 'Ativar'} onClick={()=>toggle(item)}>{item.enabled ? <Pause size={16}/> : <Play size={16}/>}</button><button className="auto-btn" title="Editar" onClick={()=>editAutomation(item)}><Pencil size={16}/></button><button className="auto-btn" title="Excluir" onClick={()=>setDeleting(item)}><MoreVertical size={16}/></button></div></div>
          })}
          {!loading && filtered.length > 8 && <div style={{padding:'13px 22px',fontSize:11,color:'#68736d'}}>Mostrando 8 automações. Use a busca para encontrar outras.</div>}
        </div>
      </section>

      <section className="auto-section">
        <div className="auto-head"><div><h2>Histórico de disparos</h2><p>Últimos eventos registrados pelas automações.</p></div></div>
        {dispatches.length === 0 ? <div className="auto-empty"><Activity size={30}/><strong>Nenhum disparo registrado</strong><p>Os envios aparecerão aqui quando uma automação for executada.</p></div> : <div style={{overflowX:'auto'}}><table className="auto-history-table"><thead><tr><th>Automação</th><th>Paciente</th><th>Mensagem</th><th>Status</th><th>Enviado em</th></tr></thead><tbody>{dispatches.slice(0,8).map(d=><tr key={d.id}><td>{items.find(a=>a.id===d.automation_id)?.name || 'Automação'}</td><td>{d.recipient_number || 'Número não informado'}</td><td>Mensagem automática</td><td><span className={`auto-status ${['failed','error'].includes(d.status) ? 'fail' : ''}`}>{['sent','completed','delivered'].includes(d.status) ? 'Entregue' : d.status}</span></td><td>{d.sent_at ? formatZoned(d.sent_at, activeCompany?.timezone || BR_TIMEZONE) : d.scheduled_for ? formatZoned(d.scheduled_for, activeCompany?.timezone || BR_TIMEZONE) : '—'}</td></tr>)}</tbody></table></div>}
      </section>
    </div>

    {open && <div className="auto-overlay"><form className="auto-builder" onSubmit={save}>
      <header className="auto-builder-head"><div><span className="eyebrow">{editing ? 'Editar automação' : 'Nova automação'}</span><h2>{editing ? editing.name : 'Configure sua automação'}</h2><p>Defina quando a mensagem acontece e veja o que o paciente receberá.</p></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={20}/></button></header>
      {error && <div className="form-error" style={{margin:'12px 18px 0'}}>{error}</div>}
      <div className="auto-content">
        <div className="auto-card">
          <h3>1. Quando isso acontece?</h3><p>Escolha o evento que inicia a automação.</p>
          <div className="auto-field"><label>Nome da automação</label><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Lembrete de consulta"/></div>
          <div className="auto-field"><label>Evento</label><select value={type} onChange={e=>setType(e.target.value)}><option value="appointment_reminder">Consulta marcada</option><option value="appointment_confirmation">Consulta criada</option><option value="appointment_followup">Consulta realizada</option></select></div>
          <div className="auto-field"><label>2. Quando enviar?</label><div className="auto-options">{[['60','1 hora antes da consulta'],['120','2 horas antes da consulta'],['1440','1 dia antes da consulta'],['2880','2 dias antes da consulta'],['10080','7 dias antes da consulta']].map(([value,label])=><label className={`auto-option ${advance===value?'selected':''}`} key={value}><input type="radio" name="advance" checked={advance===value} onChange={()=>setAdvance(value)}/>{label}</label>)}</div></div>
          <div className="auto-field"><label>Status</label><select value={enabled?'active':'inactive'} onChange={e=>setEnabled(e.target.value==='active')}><option value="active">Ativa</option><option value="inactive">Pausada</option></select></div>
          <div className="auto-note">A automação usa os dados da consulta para personalizar a mensagem automaticamente.</div>
        </div>
        <div className="auto-card auto-preview">
          <h3>3. O que o paciente receberá?</h3><p>Escolha um modelo e confira a mensagem antes de salvar.</p>
          {templates.length ? <div className="auto-template-grid">{templates.slice(0,8).map(t=>{const Icon=iconForTemplate(t.name);return <button type="button" className={`auto-template ${templateId===t.id?'selected':''}`} key={t.id} onClick={()=>{setTemplateId(t.id);if(!name)setName(t.name)}}><span className="auto-template-icon"><Icon size={15}/></span><span><b>{t.name}</b><small>{t.name === 'Lembrete de consulta' ? 'Antes da consulta' : 'Mensagem pronta'}</small></span></button>})}</div> : <div className="auto-note">Nenhum template ativo disponível. Cadastre uma mensagem em Templates antes de criar a automação.</div>}
          <div className="auto-preview-phone"><div className="auto-phone-head"><MessageCircle size={15}/> Consultório</div><div className="auto-phone-chat"><div className="auto-bubble">{previewText}<small>10:30 ✓✓</small></div></div></div>
          <button type="button" className="auto-secondary" style={{width:'100%',marginTop:10,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7}} onClick={()=>setPreview(true)} disabled={!selectedTemplate}><Eye size={15}/> Ampliar preview</button>
          <div className="auto-summary"><strong>Será enviado via WhatsApp</strong><br/>O paciente receberá esta mensagem automaticamente conforme a regra escolhida.</div>
        </div>
      </div>
      <footer className="auto-builder-foot"><button type="button" className="auto-secondary" onClick={()=>setOpen(false)}>Cancelar</button><button className="auto-primary" disabled={saving || !selectedTemplate}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar automação'} <CheckCircle2 size={15}/></button></footer>
    </form></div>}

    {preview && <div className="auto-overlay"><div className="auto-builder auto-modal"><header className="auto-builder-head"><div><span className="eyebrow">Preview</span><h2>Como o paciente verá</h2></div><button className="icon-btn" onClick={()=>setPreview(false)}><XCircle size={20}/></button></header><div className="auto-card" style={{margin:16}}><div className="auto-preview-phone" style={{marginTop:0}}><div className="auto-phone-head"><MessageCircle size={15}/> Consultório</div><div className="auto-phone-chat" style={{minHeight:360}}><div className="auto-bubble">{previewText}<small>10:30 ✓✓</small></div></div></div><button className="auto-primary" style={{width:'100%',justifyContent:'center',marginTop:12}} onClick={()=>setPreview(false)}>Fechar preview</button></div></div></div>}

    {deleting && <div className="auto-overlay"><div className="auto-card" style={{width:'min(420px,100%)'}}><h3>Excluir automação?</h3><p style={{color:'#727d77',fontSize:12}}>A automação “{deleting.name}” será removida permanentemente.</p><div className="auto-builder-foot" style={{padding:'16px 0 0',marginTop:14}}><button className="auto-secondary" onClick={()=>setDeleting(null)}>Cancelar</button><button className="auto-primary auto-danger" onClick={remove}>Excluir</button></div></div></div>}
  </TenantPage>
}
