import React, { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { Activity, BarChart3, Bot, Building2, CalendarDays, Eye, EyeOff, LayoutDashboard, LogOut, MessageCircle, Settings, ShieldCheck, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from './lib/supabase'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import Landing from './Landing'
import { AdminDashboard, AdminCompanies, NewCompany, CompanyDetail, Permissions, AdminUsers, AdminMessages, AdminPlaceholder, TenantDashboard, PatientsPage, ProfessionalsPage, AgendaPage, WhatsAppPage, TemplatesPage, AutomationsPage, TenantSettingsPage } from './pages'
type Icon=LucideIcon; type NavItem={path:string;label:string;icon:Icon}
const tenantNav:NavItem[]=[{path:'/dashboard',label:'Dashboard',icon:LayoutDashboard},{path:'/agenda',label:'Agenda',icon:CalendarDays},{path:'/pacientes',label:'Pacientes',icon:Users},{path:'/profissionais',label:'Profissionais',icon:UserRound},{path:'/whatsapp',label:'WhatsApp',icon:MessageCircle},{path:'/automacoes',label:'Automações',icon:Bot},{path:'/configuracoes',label:'Configurações',icon:Settings}]
const adminNav:NavItem[]=[{path:'/admin/dashboard',label:'Dashboard',icon:LayoutDashboard},{path:'/admin/empresas',label:'Empresas',icon:Building2},{path:'/admin/usuarios',label:'Usuários',icon:Users},{path:'/admin/permissoes',label:'Permissões',icon:ShieldCheck},{path:'/admin/whatsapp',label:'WhatsApp',icon:MessageCircle},{path:'/admin/mensagens',label:'Mensagens',icon:BarChart3},{path:'/admin/automacoes',label:'Automações',icon:Bot},{path:'/admin/atividade',label:'Atividade',icon:Activity},{path:'/admin/configuracoes',label:'Configurações',icon:Settings}]
function Logo(){return <div className="app-logo"><img src="/favicon.svg" alt="Consulta Pro"/><span>Consulta Pro</span></div>}
function Login(){const navigate=useNavigate();const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[showPassword,setShowPassword]=useState(false);const[error,setError]=useState('');const[loading,setLoading]=useState(false);async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);if(!supabase){setError('Supabase não configurado.');setLoading(false);return}const{error}=await supabase.auth.signInWithPassword({email,password});if(error){setError('E-mail ou senha inválidos.');setLoading(false);return}navigate('/dashboard')}return <div className="auth"><div className="auth-card"><Logo/><h1>Bem-vindo de volta</h1><p>Entre para acessar o sistema.</p><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<div className="password-wrap"><input type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="icon-btn" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error&&<div className="form-error">{error}</div>}<button className="hero-btn full" disabled={loading}>{loading?'Entrando...':'Entrar'}</button></form><button className="back" onClick={()=>navigate('/')}>Voltar para o início</button></div></div>}
function SessionGate(){const[state,setState]=useState<'loading'|'ready'|'none'>('loading');useEffect(()=>{let alive=true;async function load(){if(!supabase){if(alive)setState('none');return}const{data:{session}}=await supabase.auth.getSession();if(alive)setState(session?'ready':'none')}load();const subscription=supabase?.auth.onAuthStateChange(()=>load()).data.subscription;return()=>{alive=false;subscription?.unsubscribe()}},[]);if(state==='loading')return <div className="auth"><div className="panel">Carregando sessão...</div></div>;if(state==='none')return <Navigate to="/login" replace/>;return <Outlet/>}
function RoleGate({admin}:{admin:boolean}){const[state,setState]=useState<'loading'|'allowed'|'denied'|'error'>('loading');useEffect(()=>{let alive=true;async function load(){try{if(!supabase)throw Error();const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw Error();const{data:profile,error}=await supabase.from('profiles').select('is_superadmin').eq('id',user.id).maybeSingle();if(error)throw error;const jwtAdmin=user.app_metadata?.role==='superadmin'||user.app_metadata?.is_superadmin===true;if(alive)setState(Boolean(profile?.is_superadmin||jwtAdmin)===admin?'allowed':'denied')}catch{if(alive)setState('error')}}load();return()=>{alive=false}},[admin]);if(state==='loading')return <div className="auth"><div className="panel">Carregando acesso...</div></div>;if(state==='error')return <Navigate to="/login" replace/>;if(state==='denied')return <Navigate to={admin?'/dashboard':'/admin/dashboard'} replace/>;return <Outlet/>}
function AdminLayout(){const navigate=useNavigate();async function logout(){await supabase?.auth.signOut();navigate('/login')}return <div className="layout"><aside><Logo/><div className="company"><strong>Administração</strong><small>Visão global da plataforma</small></div><nav className="sidebar-nav">{adminNav.map(({path,label,icon:Icon})=><NavLink key={path} to={path}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="profile"><b>SA</b><span>Superadmin<small>Controle global</small></span><button onClick={logout}><LogOut size={15}/></button></div></aside><main><header><strong>Consulta Pro</strong><span>Superadmin</span></header><Outlet/></main></div>}
function TenantLayout(){const{activeCompany,companies,setActiveCompany}=useTenant();const navigate=useNavigate();async function logout(){await supabase?.auth.signOut();navigate('/login')}if(!activeCompany)return <div className="content"><section className="panel"><Building2 size={36}/><h2>Nenhuma empresa vinculada</h2><p>Seu usuário ainda não possui um consultório associado.</p></section></div>;return <div className="layout"><aside><Logo/><div className="company"><strong>{activeCompany.name}</strong><small>Tenant ativo</small></div>{companies.length>1&&<select className="company-select" value={activeCompany.id} onChange={e=>{const company=companies.find(x=>x.id===e.target.value);if(company)setActiveCompany(company)}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}<nav className="sidebar-nav">{tenantNav.map(({path,label,icon:Icon})=><NavLink key={path} to={path}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="profile"><b>U</b><span>Conta<small>Tenant protegido por RLS</small></span><button onClick={logout}><LogOut size={15}/></button></div></aside><main><header><strong>{activeCompany.name}</strong><span>Operação</span></header><Outlet/></main></div>}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route element={<SessionGate />}>
        <Route element={<TenantProvider><Outlet /></TenantProvider>}>

          <Route element={<RoleGate admin={true} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/empresas" element={<AdminCompanies />} />
              <Route path="/admin/empresas/nova" element={<NewCompany />} />
              <Route path="/admin/empresas/:id" element={<CompanyDetail />} />
              <Route path="/admin/usuarios" element={<AdminUsers />} />
              <Route path="/admin/permissoes" element={<Permissions />} />
              <Route path="/admin/whatsapp" element={<AdminPlaceholder title="WhatsApp" description="Saúde das integrações por empresa." icon={MessageCircle} />} />
              <Route path="/admin/mensagens" element={<AdminMessages />} />
              <Route path="/admin/automacoes" element={<AdminPlaceholder title="Automações" description="Automações executadas pelos tenants." icon={Bot} />} />
              <Route path="/admin/atividade" element={<AdminPlaceholder title="Atividade" description="Auditoria e eventos da plataforma." icon={Activity} />} />
              <Route path="/admin/configuracoes" element={<AdminPlaceholder title="Configurações" description="Configurações globais da plataforma." icon={Settings} />} />
            </Route>
          </Route>

          <Route element={<RoleGate admin={false} />}>
            <Route element={<TenantLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<TenantDashboard />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/pacientes" element={<PatientsPage />} />
              <Route path="/profissionais" element={<ProfessionalsPage />} />
              <Route path="/whatsapp" element={<WhatsAppPage />} />
              <Route path="/whatsapp/templates" element={<TemplatesPage />} />
              <Route path="/automacoes" element={<AutomationsPage />} />
              <Route path="/configuracoes" element={<TenantSettingsPage />} />
            </Route>
          </Route>

        </Route>
      </Route>
    </Routes>
  )
}
