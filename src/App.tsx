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
