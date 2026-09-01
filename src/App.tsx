import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowLeft, BarChart3, Bot, Building2, CalendarDays, CheckCircle2,
  ChevronRight, CircleAlert, Eye, EyeOff, LayoutDashboard, LogIn, LogOut, MessageCircle,
  Plus, Search, Settings, ShieldCheck, UserRound, Users, Wifi, XCircle
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import Landing from './Landing'
import { AdminDashboard, AdminCompanies, NewCompany, CompanyDetail, Permissions, AdminUsers, AdminMessages, AdminPlaceholder, TenantPage, PatientsPage, ProfessionalsPage, AgendaPage, WhatsAppPage, AutomationsPage, TenantSettingsPage, TenantDashboard } from './pages'

const BR_TIMEZONE='America/Sao_Paulo'
function getSupabase(){if(!supabase)throw new Error('Supabase não configurado.');return supabase}
function zonedParts(date:Date,tz:string){const p=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);const o=Object.fromEntries(p.map(x=>[x.type,x.value]));return{year:Number(o.year),month:Number(o.month),day:Number(o.day),hour:Number(o.hour),minute:Number(o.minute),second:Number(o.second)}}
function localDateKey(date:Date,tz:string){const p=zonedParts(date,tz);return `${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`}
function localDateTimeToUtc(value:string,tz:string){const [ds,ts]=value.split('T');const [y,m,d]=ds.split('-').map(Number);const [hh,mm]=ts.split(':').map(Number);let guess=Date.UTC(y,m-1,d,hh,mm);for(let i=0;i<3;i++){const p=zonedParts(new Date(guess),tz);const asUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);guess+=Date.UTC(y,m-1,d,hh,mm)-asUtc}return new Date(guess)}
function utcToLocalInput(value:string,tz:string){const p=zonedParts(new Date(value),tz);return{date:`${p.year}-${String(p.month).padStart(2,"0")}-${String(p.day).padStart(2,"0")}`,time:`${String(p.hour).padStart(2,"0")}:${String(p.minute).padStart(2,"0")}`}}
function formatZoned(value:string,tz:string,opts:Intl.DateTimeFormatOptions={dateStyle:'short',timeStyle:'short'}){return new Intl.DateTimeFormat('pt-BR',{...opts,timeZone:tz}).format(new Date(value))}

type Company = { id: string; name: string; legal_name?: string | null; cnpj?: string | null; phone?: string | null; email?: string | null }
type Icon = React.ComponentType<any>

const tenantNav: [string, string, Icon][] = [
  ['/dashboard', 'Dashboard', LayoutDashboard],
  ['/agenda', 'Agenda', CalendarDays],
  ['/pacientes', 'Pacientes', Users],
  ['/profissionais', 'Profissionais', UserRound],
  ['/whatsapp', 'WhatsApp', MessageCircle],
  ['/automacoes', 'Automações', Bot],
  ['/configuracoes', 'Configurações', Settings],
]

const adminNav: [string, string, Icon][] = [
  ['/admin/dashboard', 'Dashboard', LayoutDashboard],
  ['/admin/empresas', 'Empresas', Building2],
  ['/admin/usuarios', 'Usuários', Users],
  ['/admin/permissoes', 'Permissões', ShieldCheck],
  ['/admin/whatsapp', 'WhatsApp', MessageCircle],
  ['/admin/mensagens', 'Mensagens', BarChart3],
  ['/admin/automacoes', 'Automações', Bot],
  ['/admin/atividade', 'Atividade', Activity],
  ['/admin/configuracoes', 'Configurações', Settings],
]

function Logo() {
  return <div className="app-logo"><img src="/favicon.svg" alt="Consulta Pro" /><span>Consulta Pro</span></div>
}

function Login() {
  const navigate = useNavigate()
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [showPassword,setShowPassword]=useState(false); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);if(!supabase){setError('Supabase não configurado.');setLoading(false);return}const{error}=await supabase!.auth.signInWithPassword({email,password});if(error){setError('E-mail ou senha inválidos.');setLoading(false);return}navigate('/app');}
  return <div className="auth"><div className="auth-card"><Logo/><h1>Bem-vindo de volta</h1><p>Entre para acessar o sistema.</p><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<div className="password-wrap"><input type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="icon-btn" title={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error&&<div className="form-error">{error}</div>}<button className="hero-btn full" disabled={loading}>{loading?'Entrando...':'Entrar'}</button></form><button className="back" onClick={()=>navigate('/')}>Voltar para o início</button></div></div>
}

function SessionGate() {
  const [state,setState]=useState<'loading'|'ready'|'none'>('loading')

  useEffect(()=>{
    let alive=true
    async function load(){
      if(!supabase){if(alive)setState('none');return}
      const{data:{session}}=await supabase!.auth.getSession()
      if(alive)setState(session?'ready':'none')
    }
    load()
    const{data}=supabase?.auth.onAuthStateChange(()=>load())||{data:{subscription:{unsubscribe(){}}}}
    return()=>{alive=false;data.subscription.unsubscribe()}
  },[])

  if(state==='loading')return <div className="auth"><div className="panel">Carregando sessão...</div></div>
  if(state==='none')return <Navigate to="/login" replace/>
  return <Outlet/>
}


function RoleGate({admin}:{admin:boolean}){
  const[state,setState]=useState<'loading'|'allowed'|'denied'|'error'>('loading')
  useEffect(()=>{
    let alive=true
    let settled=false
    async function load(){
      try{
        const client=getSupabase()
        const{data:{user},error:userError}=await client.auth.getUser()
        if(userError||!user){if(alive)setState('error');return}
        const{data:profile,error:profileError}=await client.from('profiles').select('is_superadmin').eq('id',user.id).maybeSingle()
        if(profileError){console.error('Erro ao carregar perfil:',profileError);if(alive)setState('error');return}
        const jwtAdmin=user.app_metadata?.role==='superadmin'||user.app_metadata?.is_superadmin===true
        const isAdmin=Boolean(profile?.is_superadmin||jwtAdmin)
        if(alive)setState(isAdmin===admin?'allowed':'denied')
      }catch(error){console.error('Erro ao validar acesso:',error);if(alive)setState('error')}
      finally{settled=true}
    }
    load()
    const timer=window.setTimeout(()=>{if(alive&&!settled)setState('error')},8000)
    return()=>{alive=false;window.clearTimeout(timer)}
  },[admin])
  if(state==='loading')return <div className="auth"><div className="panel">Carregando acesso...</div></div>
  if(state==='error')return <Navigate to="/login" replace/>
  if(state==='denied')return <Navigate to={admin?'/dashboard':'/admin/dashboard'} replace/>
  return <Outlet/>
}

function AdminLayout(){
  const navigate=useNavigate()
  async function logout(){await supabase?.auth.signOut();navigate('/login')}
  return <div className="layout"><aside><Logo/><div className="company"><strong>Administração</strong><small>Visão global da plataforma</small></div><nav className="sidebar-nav">{adminNav.map(([path,label,Icon])=><NavLink key={path} to={path}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="profile"><b>SA</b><span>Superadmin<small>Controle global</small></span><button onClick={logout} title="Sair"><LogOut size={15}/></button></div></aside><main><header><strong>Consulta Pro</strong><span>Superadmin</span></header><Outlet/></main></div>
}

function TenantLayout(){
  const{activeCompany,companies,setActiveCompany}=useTenant();const navigate=useNavigate()
  async function logout(){await supabase?.auth.signOut();navigate('/login')}
  if(!activeCompany)return <div className="content"><section className="panel"><Building2 size={36}/><h2>Nenhuma empresa vinculada</h2><p>Seu usuário ainda não possui um consultório associado.</p></section></div>
  return <div className="layout"><aside><Logo/><div className="company"><strong>{activeCompany.name}</strong><small>Tenant ativo</small></div>{companies.length>1&&<select className="company-select" value={activeCompany.id} onChange={e=>{const c=companies.find(x=>x.id===e.target.value);if(c)setActiveCompany(c)}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}<nav className="sidebar-nav">{tenantNav.map(([path,label,Icon])=><NavLink key={path} to={path}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="profile"><b>U</b><span>Conta<small>Tenant protegido por RLS</small></span><button onClick={logout}><LogOut size={15}/></button></div></aside><main><header><strong>{activeCompany.name}</strong><span>Operação</span></header><Outlet/></main></div>
}

function TenantSettingsPage(){
  const{activeCompany}=useTenant();
  const[name,setName]=useState('');const[legal,setLegal]=useState('');const[cnpj,setCnpj]=useState('');const[phone,setPhone]=useState('');const[email,setEmail]=useState('');
  const[timezone,setTimezone]=useState('America/Sao_Paulo');const[zip,setZip]=useState('');const[street,setStreet]=useState('');const[number,setNumber]=useState('');const[complement,setComplement]=useState('');const[neighborhood,setNeighborhood]=useState('');const[city,setCity]=useState('');const[state,setState]=useState('');
  const[fullName,setFullName]=useState('');const[loginEmail,setLoginEmail]=useState('');const[newPassword,setNewPassword]=useState('');const[showPassword,setShowPassword]=useState(false);
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[error,setError]=useState('');const[success,setSuccess]=useState('');
  useEffect(()=>{async function load(){if(!supabase||!activeCompany)return;setLoading(true);const[{data:c},{data:{user}}]=await Promise.all([supabase!.from('companies').select('*').eq('id',activeCompany.id).maybeSingle(),supabase!.auth.getUser()]);setName(c?.name||'');setTimezone(c?.timezone||'America/Sao_Paulo');setLegal(c?.legal_name||'');setCnpj(c?.cnpj||'');setPhone(c?.phone||'');setEmail(c?.email||'');setZip(c?.zip_code||'');setStreet(c?.street||'');setNumber(c?.number||'');setComplement(c?.complement||'');setNeighborhood(c?.neighborhood||'');setCity(c?.city||'');setState(c?.state||'');setLoginEmail(user?.email||'');if(user){const{data:p}=await supabase!.from('profiles').select('full_name').eq('id',user.id).maybeSingle();setFullName(p?.full_name||'')}setLoading(false)}load()},[activeCompany?.id]);
  async function saveCompany(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setSaving(true);setError('');setSuccess('');const{error}=await supabase!.from('companies').update({name:name.trim(),legal_name:legal||null,cnpj:cnpj||null,phone:phone||null,email:email||null,zip_code:zip||null,street:street||null,number:number||null,complement:complement||null,neighborhood:neighborhood||null,city:city||null,state:state||null}).eq('id',activeCompany.id);if(error)setError(error.message);else setSuccess('Dados do consultório salvos.');setSaving(false)}
  async function saveProfile(e:React.FormEvent){e.preventDefault();if(!supabase)return;setSaving(true);setError('');setSuccess('');const{data:{user}}=await supabase!.auth.getUser();if(!user){setError('Sessão expirada.');setSaving(false);return}const p=await supabase!.from('profiles').upsert({id:user.id,full_name:fullName.trim()},{onConflict:'id'});if(p.error){setError(p.error.message);setSaving(false);return}if(newPassword){const u=await supabase!.auth.updateUser({password:newPassword});if(u.error){setError(u.error.message);setSaving(false);return}}setNewPassword('');setSuccess('Perfil e segurança atualizados.');setSaving(false)}
  if(loading)return <TenantPage title="Configurações" description="Dados do consultório e da conta."><div className="panel">Carregando...</div></TenantPage>;
  return <TenantPage title="Configurações" description="Dados do consultório e da conta.">
    <section className="panel"><div className="head"><div><h2>Consultório</h2><p>Dados exibidos e usados na operação.</p></div></div><form className="form-grid" onSubmit={saveCompany}><label>Nome fantasia*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Razão social<input value={legal} onChange={e=>setLegal(e.target.value)}/></label><label>CNPJ<input value={cnpj} onChange={e=>setCnpj(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>CEP<input value={zip} onChange={e=>setZip(e.target.value)}/></label><label>Rua<input value={street} onChange={e=>setStreet(e.target.value)}/></label><label>Número<input value={number} onChange={e=>setNumber(e.target.value)}/></label><label>Complemento<input value={complement} onChange={e=>setComplement(e.target.value)}/></label><label>Bairro<input value={neighborhood} onChange={e=>setNeighborhood(e.target.value)}/></label><label>Cidade<input value={city} onChange={e=>setCity(e.target.value)}/></label><label>Estado<input maxLength={2} value={state} onChange={e=>setState(e.target.value.toUpperCase())}/></label><div><button className="hero-btn" disabled={saving}>{saving?'Salvando...':'Salvar dados'} <CheckCircle2 size={16}/></button></div></form></section>
    <section className="panel"><div className="head"><div><h2>Minha conta</h2><p>Atualize seu nome e senha de acesso.</p></div></div><form className="form-grid" onSubmit={saveProfile}><label>Nome completo<input value={fullName} onChange={e=>setFullName(e.target.value)}/></label><label>E-mail de login<input disabled value={loginEmail}/></label><label>Nova senha<div className="password-wrap"><input type={showPassword?'text':'password'} minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Deixe vazio para manter"/><button type="button" className="icon-btn" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label><div><button className="hero-btn" disabled={saving}>{saving?'Salvando...':'Salvar conta'} <CheckCircle2 size={16}/></button></div></form></section>
    {error&&<div className="form-error">{error}</div>}{success&&<div className="form-success">{success}</div>}
  </TenantPage>
}
function TenantDashboard(){const{activeCompany}=useTenant();const navigate=useNavigate();const[stats,setStats]=useState({today:0,confirmed:0,pending:0,done:0,patients:0,professionals:0});const[next,setNext]=useState<any[]>([]);const[wa,setWa]=useState<any>(null);useEffect(()=>{async function load(){if(!supabase||!activeCompany)return;const{data:serverNow,error:clockError}=await supabase!.rpc('server_now');if(clockError||!serverNow)return;const tz=activeCompany.timezone||BR_TIMEZONE;const dayKey=localDateKey(new Date(serverNow),tz);const start=localDateTimeToUtc(dayKey+'T00:00',tz);const end=localDateTimeToUtc(dayKey+'T23:59',tz);end.setTime(end.getTime()+60000);const [ap,pa,pr,wi]=await Promise.all([supabase!.from('appointments').select('id,starts_at,status,patients(full_name),professionals(name)').eq('company_id',activeCompany.id).gte('starts_at',start.toISOString()).lt('starts_at',end.toISOString()).order('starts_at'),supabase!.from('patients').select('*',{count:'exact',head:true}).eq('company_id',activeCompany.id),supabase!.from('professionals').select('*',{count:'exact',head:true}).eq('company_id',activeCompany.id),supabase!.from('whatsapp_integrations').select('status,phone_number').eq('company_id',activeCompany.id).maybeSingle()]);const list=ap.data||[];setNext(list.slice(0,5));setStats({today:list.length,confirmed:list.filter(x=>x.status==='confirmed').length,pending:list.filter(x=>x.status==='scheduled'||x.status==='pending').length,done:list.filter(x=>x.status==='completed'||x.status==='done').length,patients:pa.count||0,professionals:pr.count||0});setWa(wi.data||null)}load()},[activeCompany?.id]);return <div className="content"><div className="head"><div><h1>Dashboard</h1><p>{activeCompany?.name}</p></div><button className="hero-btn" onClick={()=>navigate('/agenda')}><Plus size={16}/> Novo atendimento</button></div><div className="metrics"><Metric label="Consultas hoje" value={stats.today} icon={CalendarDays}/><Metric label="Confirmadas" value={stats.confirmed} icon={CheckCircle2}/><Metric label="Pendentes" value={stats.pending} icon={Activity}/><Metric label="Realizadas" value={stats.done} icon={CheckCircle2}/></div><div className="grid"><section className="panel"><div className="head"><div><h2>Próximos atendimentos</h2><p>Agenda de hoje</p></div><button className="back-link" onClick={()=>navigate('/agenda')}>Ver agenda</button></div>{next.length===0?<Empty text="Nenhum atendimento para hoje."/>:next.map(a=><div className="row" key={a.id}><CalendarDays size={17}/><span><b>{new Intl.DateTimeFormat('pt-BR',{timeZone:activeCompany?.timezone||BR_TIMEZONE,hour:'2-digit',minute:'2-digit'}).format(new Date(a.starts_at))} · {a.patients?.full_name||'Paciente'}</b><small>{a.professionals?.name||'Profissional'} · {a.status}</small></span></div>)}</section><section className="panel"><h2>Resumo do consultório</h2><div className="stats"><div><b>{stats.patients}</b><small>pacientes</small></div><div><b>{stats.professionals}</b><small>profissionais</small></div></div><div className="wa" style={{marginTop:12}}><MessageCircle size={20}/><span><b>{wa?.status||'WhatsApp não conectado'}</b><small>{wa?.phone_number||'Configure o número da empresa.'}</small></span></div></section></div></div>}

export default function App(){
  return <Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={<Login/>}/>

    <Route element={<SessionGate/>}>
      <Route element={<TenantProvider><Outlet/></TenantProvider>}>
      <Route element={<RoleGate admin={true}/>}>
        <Route element={<AdminLayout/>}>
        <Route path="admin/dashboard" element={<AdminDashboard/>}/>
        <Route path="admin/empresas" element={<AdminCompanies/>}/>
        <Route path="admin/empresas/nova" element={<NewCompany/>}/>
        <Route path="admin/empresas/:id" element={<CompanyDetail/>}/>
        <Route path="admin/usuarios" element={<AdminUsers/>}/>
        <Route path="admin/permissoes" element={<Permissions/>}/>
        <Route path="admin/whatsapp" element={<AdminPlaceholder title="WhatsApp" description="Saúde das integrações por empresa." icon={MessageCircle}/>}/>
        <Route path="admin/mensagens" element={<AdminMessages/>}/>
        <Route path="admin/automacoes" element={<AdminPlaceholder title="Automações" description="Automações executadas pelos tenants." icon={Bot}/>}/>
        <Route path="admin/atividade" element={<AdminPlaceholder title="Atividade" description="Auditoria e eventos da plataforma." icon={Activity}/>}/>
        <Route path="admin/configuracoes" element={<AdminPlaceholder title="Configurações" description="Configurações globais da plataforma." icon={Settings}/>}/>
        <Route path="empresas" element={<AdminCompanies/>}/>
        <Route path="empresas/nova" element={<NewCompany/>}/>
        <Route path="empresas/:id" element={<CompanyDetail/>}/>
        <Route path="usuarios" element={<AdminUsers/>}/>
        <Route path="permissoes" element={<Permissions/>}/>
        <Route path="mensagens" element={<AdminMessages/>}/>
        <Route path="atividade" element={<AdminPlaceholder title="Atividade" description="Auditoria e eventos da plataforma." icon={Activity}/>}/>
        </Route>
      </Route>

      <Route element={<RoleGate admin={false}/>}>
        <Route element={<TenantLayout/>}>
        <Route index element={<Navigate to="/dashboard" replace/>}/>
        <Route path="dashboard" element={<TenantDashboard/>}/>
        <Route path="agenda" element={<AgendaPage/>}/>
        <Route path="pacientes" element={<PatientsPage/>}/>
        <Route path="profissionais" element={<ProfessionalsPage/>}/>
        <Route path="whatsapp" element={<WhatsAppPage/>}/>
        <Route path="automacoes" element={<AutomationsPage/>}/>
        <Route path="configuracoes" element={<TenantSettingsPage/>}/>
        </Route>
      </Route>
    </Route>
      </Route>

    <Route path="/app" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}
