import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, ChevronRight, Plus, Search, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../contexts/TenantContext'
import { Empty, TenantPage, getSupabase, localDateKey, localDateTimeToUtc, utcToLocalInput, formatZoned } from '../shared'
function AgendaPage(){
  const{activeCompany}=useTenant();
  const[today,setToday]=useState(()=>new Date());
  const[view,setView]=useState<'day'|'week'|'month'|'list'>('month');
  const[items,setItems]=useState<any[]>([]);const[patients,setPatients]=useState<any[]>([]);const[pros,setPros]=useState<any[]>([]);
  const[open,setOpen]=useState(false);const[editing,setEditing]=useState<any>(null);
  const[patient,setPatient]=useState('');const[professional,setProfessional]=useState('');const[date,setDate]=useState('');const[time,setTime]=useState('');const[duration,setDuration]=useState('60');const[type,setType]=useState('Consulta');const[notes,setNotes]=useState('');const[status,setStatus]=useState('scheduled');const[error,setError]=useState('');const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');const[filterProfessional,setFilterProfessional]=useState('');const[filterStatus,setFilterStatus]=useState('');
  const tz=activeCompany?.timezone||BR_TIMEZONE;const dayKey=localDateKey(today,tz);
  const range=useMemo(()=>{if(view==='day'||view==='list')return{start:dayKey,end:dayKey};if(view==='week'){const d=new Date(today);const w=d.getDay()||7;d.setDate(d.getDate()-w+1);const e=new Date(d);e.setDate(e.getDate()+6);return{start:localDateKey(d,tz),end:localDateKey(e,tz)}}const first=new Date(today.getFullYear(),today.getMonth(),1);const last=new Date(today.getFullYear(),today.getMonth()+1,0);return{start:localDateKey(first,tz),end:localDateKey(last,tz)}},[today,dayKey,tz,view]);
  async function load(){if(!supabase||!activeCompany)return;setLoading(true);setError('');const from=localDateTimeToUtc(range.start+'T00:00',tz);const endDate=new Date(range.end+'T12:00:00');endDate.setDate(endDate.getDate()+1);const to=localDateTimeToUtc(localDateKey(endDate,tz)+'T00:00',tz);const[a,b,c]=await Promise.all([supabase!.from('appointments').select('*,patients(full_name),professionals(name)').eq('company_id',activeCompany.id).gte('starts_at',from.toISOString()).lt('starts_at',to.toISOString()).order('starts_at'),supabase!.from('patients').select('id,full_name').eq('company_id',activeCompany.id).eq('status','active').order('full_name'),supabase!.from('professionals').select('id,name').eq('company_id',activeCompany.id).eq('status','active').order('name')]);if(a.error)setError(a.error.message);else setItems(a.data||[]);if(b.error)setError(b.error.message);else setPatients(b.data||[]);if(c.error)setError(c.error.message);else setPros(c.data||[]);setLoading(false)}
  useEffect(()=>{async function init(){if(!supabase||!activeCompany)return;const{data,error}=await supabase!.rpc('server_now');if(!error&&data){const k=localDateKey(new Date(data),tz);setToday(new Date(k+'T12:00:00'))}await load()}init()},[activeCompany?.id,tz,range.start,range.end]);
  const filteredItems=useMemo(()=>{const q=search.trim().toLowerCase();return items.filter(a=>{const name=String(a.patients?.full_name||'').toLowerCase();const pro=String(a.professionals?.name||'').toLowerCase();return(!q||name.includes(q))&&(!filterProfessional||a.professional_id===filterProfessional)&&(!filterStatus||a.status===filterStatus)})},[items,search,filterProfessional,filterStatus]);
  function clearFilters(){setSearch('');setFilterProfessional('');setFilterStatus('')}
  function resetForm(slot?:number){setEditing(null);setDate(dayKey);setTime(slot===undefined?'09:00':String(slot).padStart(2,'0')+':00');setPatient('');setProfessional('');setDuration('60');setType('Consulta');setNotes('');setStatus('scheduled');setError('');setOpen(true)}
  function editAppointment(a:any){setEditing(a);const local=utcToLocalInput(a.starts_at,activeCompany?.timezone||BR_TIMEZONE);setDate(local.date);setTime(local.time);setPatient(a.patient_id);setProfessional(a.professional_id);setDuration(String(Math.max(15,Math.round((new Date(a.ends_at).getTime()-new Date(a.starts_at).getTime())/60000))));setType(a.appointment_type||'Consulta');setNotes(a.notes||'');setStatus(a.status||'scheduled');setError('');setOpen(true)}
  async function save(e:React.FormEvent){
    e.preventDefault();if(!supabase||!activeCompany)return;setError('');
    if(!patient||!professional){setError('Selecione paciente e profissional.');return}
    if(!date||!time){setError('Informe data e horário.');return}
    const minutes=Number(duration);
    if(!Number.isFinite(minutes)||minutes<15||minutes>480){setError('A duração deve ficar entre 15 minutos e 8 horas.');return}
    const start=localDateTimeToUtc(date+'T'+time,activeCompany.timezone||BR_TIMEZONE);
    if(Number.isNaN(start.getTime())){setError('Data ou horário inválido.');return}
    const end=new Date(start.getTime()+minutes*60000);
    const now=new Date();
    if(!editing&&start.getTime()<now.getTime()-60000){setError('Não é possível criar atendimento em data e horário passados.');return}
    if(end.getUTCDate()!==start.getUTCDate()&&end.getTime()-start.getTime()<24*60*60*1000){setError('O atendimento não pode ultrapassar a virada do dia.');return}
    const q=supabase!.from('appointments').select('id').eq('company_id',activeCompany.id).eq('professional_id',professional).neq('status','cancelled').lt('starts_at',end.toISOString()).gt('ends_at',start.toISOString());
    const{data:conflict,error:conflictError}=editing?await q.neq('id',editing.id).limit(1):await q.limit(1);
    if(conflictError){setError('Não foi possível validar o horário. Tente novamente.');return}
    if(conflict?.length){setError('Este profissional já possui atendimento neste horário. Escolha outro horário.');return}
    const payload={patient_id:patient,professional_id:professional,starts_at:start.toISOString(),ends_at:end.toISOString(),appointment_type:type,notes:notes.trim()||null,status};
    const result=editing?await supabase!.from('appointments').update(payload).eq('id',editing.id).eq('company_id',activeCompany.id):await supabase!.from('appointments').insert({company_id:activeCompany.id,...payload});
    if(result.error)setError('Não foi possível salvar o atendimento. Tente novamente.');else{setOpen(false);await load()}
  }
  async function changeStatus(id:string,nextStatus:string){if(!supabase||!activeCompany)return;const{error}=await supabase!.from('appointments').update({status:nextStatus}).eq('id',id).eq('company_id',activeCompany.id);if(error)setError(error.message);else await load()}
  async function remove(id:string){await changeStatus(id,'cancelled')}
  function shiftView(delta:number){setToday(d=>{const n=new Date(d);if(view==='day'||view==='list')n.setDate(n.getDate()+delta);else if(view==='week')n.setDate(n.getDate()+delta*7);else n.setMonth(n.getMonth()+delta);return n})}
  const viewTitle=view==='month'?today.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}):view==='week'?(()=>{const d=new Date(today);const w=d.getDay()||7;d.setDate(d.getDate()-w+1);const e=new Date(d);e.setDate(e.getDate()+6);return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})+' — '+e.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})})():today.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const statusNames:any={scheduled:'Agendado',confirmed:'Confirmado',completed:'Realizado',cancelled:'Cancelado'};
  const appointmentCard=(a:any,compact=false)=><div className={compact?'appointment-card compact':'appointment-card'} key={a.id} onClick={()=>editAppointment(a)}><div><b>{formatZoned(a.starts_at,tz,{hour:'2-digit',minute:'2-digit'})} · {a.patients?.full_name||'Paciente'}</b><small>{a.professionals?.name||'Profissional'} · {a.appointment_type||'Consulta'} · {statusNames[a.status]||a.status}</small></div>{!compact&&<span><button type="button" className="back-link" onClick={e=>{e.stopPropagation();editAppointment(a)}}>Editar</button>{a.status!=='confirmed'&&a.status!=='completed'&&<button type="button" className="back-link" onClick={e=>{e.stopPropagation();changeStatus(a.id,'confirmed')}}>Confirmar</button>}{a.status==='confirmed'&&<button type="button" className="back-link" onClick={e=>{e.stopPropagation();changeStatus(a.id,'completed')}}>Concluir</button>}{a.status!=='cancelled'&&a.status!=='completed'&&<button type="button" className="back-link danger" onClick={e=>{e.stopPropagation();remove(a.id)}}>Cancelar</button>}</span>}</div>;
  const renderDay=(key:string,compact=false)=>{
    const dayItems=filteredItems.filter(a=>localDateKey(new Date(a.starts_at),tz)===key).sort((a,b)=>new Date(a.starts_at).getTime()-new Date(b.starts_at).getTime());
    const lanes:any[]=[];
    const placed=dayItems.map(a=>{
      const p=zonedParts(new Date(a.starts_at),tz);
      const end=new Date(a.ends_at);
      const ep=zonedParts(end,tz);
      const startMin=(p.hour-8)*60+p.minute;
      const endMin=Math.max(startMin+15,(ep.hour-8)*60+ep.minute);
      let lane=0;
      while(lanes[lane]!==undefined&&lanes[lane]>startMin)lane++;
      lanes[lane]=endMin;
      const overlap=dayItems.filter(x=>{
        const xp=zonedParts(new Date(x.starts_at),tz), xe=zonedParts(new Date(x.ends_at),tz);
        const xs=(xp.hour-8)*60+xp.minute, xeMin=(xe.hour-8)*60+xe.minute;
        return xs<endMin&&xeMin>startMin;
      }).length;
      return {a,startMin,endMin,lane,overlap};
    });
    const slotHeight=compact?58:72;
    return <div className={compact?'calendar-day compact':'calendar-day'} style={{'--slot-h':slotHeight+'px'} as React.CSSProperties}>
      {Array.from({length:13},(_,i)=>{const hour=8+i;return <div className="calendar-slot" key={hour}><time>{String(hour).padStart(2,'0')}:00</time><div className="slot-content"><button type="button" className="slot-add" onClick={()=>{setToday(new Date(key+'T12:00:00'));resetForm(hour)}} aria-label={'Agendar às '+hour+':00'}>+</button></div></div>})}
      <div className="calendar-events-layer">{placed.map(({a,startMin,endMin,lane,overlap}:any)=>{
        const top=(startMin/60)*slotHeight, height=Math.max(38,((endMin-startMin)/60)*slotHeight-6);
        const width=100/Math.max(1,overlap), left=lane*width;
        return <div key={a.id} className="calendar-event" style={{top,height,left:'calc('+left+'% + 2px)',width:'calc('+width+'% - 6px)'}} onClick={()=>editAppointment(a)}>
          <b>{formatZoned(a.starts_at,tz,{hour:'2-digit',minute:'2-digit'})} · {a.patients?.full_name||'Paciente'}</b>
          <small>{a.professionals?.name||'Profissional'} · {a.appointment_type||'Consulta'}</small>
          <em>{statusNames[a.status]||a.status}</em>
        </div>
      })}</div>
    </div>
  };
  const weekKeys=useMemo(()=>{const d=new Date(today);const w=d.getDay()||7;d.setDate(d.getDate()-w+1);return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(x.getDate()+i);return localDateKey(x,tz)})},[today,tz]);
  const monthKeys=useMemo(()=>{const first=new Date(today.getFullYear(),today.getMonth(),1);const start=new Date(first);const w=start.getDay()||7;start.setDate(start.getDate()-w+1);return Array.from({length:42},(_,i)=>{const x=new Date(start);x.setDate(x.getDate()+i);return localDateKey(x,tz)})},[today,tz]);
  const miniMonthKeys=monthKeys;
  const monthLabel=today.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const goMonth=(delta:number)=>setToday(d=>{const n=new Date(d);n.setMonth(n.getMonth()+delta);return n});

  return <TenantPage title="Agenda" description="Calendário de atendimentos do consultório." action={<button className="hero-btn" onClick={()=>resetForm()}><Plus size={16}/> Novo atendimento</button>}>
    <section className="panel">
      <div className="agenda-toolbar"><div className="agenda-nav"><button type="button" className="agenda-today" onClick={()=>setToday(new Date())}>Hoje</button><button type="button" className="agenda-nav-btn" onClick={()=>shiftView(-1)} title="Anterior"><ArrowLeft size={18}/></button><button type="button" className="agenda-nav-btn" onClick={()=>shiftView(1)} title="Próximo"><ChevronRight size={18}/></button><label className="agenda-date-picker" title="Selecionar data"><CalendarDays size={17}/><input type="date" value={dayKey} onChange={e=>e.target.value&&setToday(new Date(e.target.value+'T12:00:00'))}/></label></div><h2>{viewTitle}</h2><div className="agenda-views">{(['day','week','month','list'] as const).map(v=><button type="button" key={v} className={view===v?'active':''} onClick={()=>setView(v)}>{v==='day'?'Dia':v==='week'?'Semana':v==='month'?'Mês':'Lista'}</button>)}</div></div>
      <div className="agenda-filters"><label className="agenda-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar paciente..."/></label><label><span>Profissional</span><select value={filterProfessional} onChange={e=>setFilterProfessional(e.target.value)}><option value="">Todos</option>{pros.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>Status</span><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">Todos</option><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option></select></label>{(search||filterProfessional||filterStatus)&&<button type="button" className="back-link clear-filters" onClick={clearFilters}>Limpar filtros</button>}</div>
      {error&&<div className="form-error">{error}</div>}
      {loading?<div className="agenda-loading"><div><strong>Carregando agenda...</strong><p>Buscando atendimentos, pacientes e profissionais.</p></div></div>:view==='day'?renderDay(dayKey):view==='week'?<div className="agenda-week">{weekKeys.map(k=><div className="agenda-week-day" key={k}><header><b>{new Date(k+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'})}</b><strong>{new Date(k+'T12:00:00').getDate()}</strong></header>{renderDay(k,true)}</div>)}</div>:view==='month'?<div className="agenda-month-layout"><aside className="agenda-mini"><button type="button" className="mini-new" onClick={()=>resetForm()}><Plus size={14}/> Novo atendimento</button><div className="mini-head"><button type="button" className="icon-btn" onClick={()=>goMonth(-1)}><ArrowLeft size={14}/></button><b>{monthLabel}</b><button type="button" className="icon-btn" onClick={()=>goMonth(1)}><ChevronRight size={14}/></button></div><div className="mini-weekdays">{['S','T','Q','Q','S','S','D'].map((d,i)=><b key={i}>{d}</b>)}</div><div className="mini-grid">{miniMonthKeys.map(k=>{const inMonth=k.slice(0,7)===localDateKey(new Date(today.getFullYear(),today.getMonth(),1),tz).slice(0,7);const selected=k===dayKey;const has=filteredItems.some(a=>localDateKey(new Date(a.starts_at),tz)===k);return <button type="button" key={k} className={(!inMonth?'muted ':'')+(selected?'selected ':'')+(has?'has-events':'')} onClick={()=>setToday(new Date(k+'T12:00:00'))}>{new Date(k+'T12:00:00').getDate()}</button>})}</div><div className="mini-summary"><b>Agenda do dia</b><span>{filteredItems.filter(a=>localDateKey(new Date(a.starts_at),tz)===dayKey).length} atendimento(s)</span></div></aside><div className="agenda-month"><div className="month-weekdays">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><b key={d}>{d}</b>)}</div><div className="month-grid">{monthKeys.map(k=>{const dayItems=filteredItems.filter(a=>localDateKey(new Date(a.starts_at),tz)===k);const inMonth=k.slice(0,7)===localDateKey(new Date(today.getFullYear(),today.getMonth(),1),tz).slice(0,7);return <div className={'month-cell '+(!inMonth?'muted':'')+(k===dayKey?' selected':'')} key={k} onClick={()=>{setToday(new Date(k+'T12:00:00'));setView('day')}}><div className="month-cell-head"><strong>{new Date(k+'T12:00:00').getDate()}</strong>{dayItems.length>0&&<span className="month-count">{dayItems.length}</span>}</div><div className="month-events">{dayItems.slice(0,3).map(a=><div key={a.id} className={'month-event status-'+a.status} onClick={e=>{e.stopPropagation();editAppointment(a)}}><b>{formatZoned(a.starts_at,tz,{hour:'2-digit',minute:'2-digit'})}</b> {a.patients?.full_name||'Paciente'}</div>)}{dayItems.length>3&&<small>+ {dayItems.length-3} outros</small>}</div></div>})}</div></div></div>:<div className="agenda-list">{filteredItems.length?filteredItems.map(a=>appointmentCard(a)):<div className="empty-box">Nenhum atendimento encontrado com os filtros atuais.</div>}</div>}
    </section>
    {open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><div><h2>{editing?'Editar atendimento':'Novo atendimento'}</h2><p>{date&&new Date(date+'T12:00').toLocaleDateString('pt-BR')} {time&&'· '+time} {duration&&'· '+duration+' min'}</p></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid"><label>Paciente*<select required value={patient} onChange={e=>setPatient(e.target.value)}><option value="">Selecione</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>Profissional*<select required value={professional} onChange={e=>setProfessional(e.target.value)}><option value="">Selecione</option>{pros.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Data*<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Hora*<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Tipo<select value={type} onChange={e=>setType(e.target.value)}><option>Consulta</option><option>Retorno</option><option>Avaliação</option><option>Online</option></select></label><label>Duração<select value={duration} onChange={e=>setDuration(e.target.value)}><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option></select></label><label className="full-field">Observações<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label></div>{error&&<div className="form-error">{error}</div>}<button type="submit" className="hero-btn">{editing?'Salvar alterações':'Agendar'}</button></form></div>}
  </TenantPage>
}
export { AgendaPage }
