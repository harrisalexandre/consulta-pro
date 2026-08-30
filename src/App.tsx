import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowLeft, BarChart3, Bot, Building2, CalendarDays, CheckCircle2,
  ChevronRight, CircleAlert, LayoutDashboard, LogIn, LogOut, MessageCircle,
  Plus, Settings, ShieldCheck, UserRound, Users, Wifi, XCircle
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { useTenant } from './contexts/TenantContext'
import Landing from './Landing'

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
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);if(!supabase){setError('Supabase não configurado.');setLoading(false);return}const{error}=await supabase.auth.signInWithPassword({email,password});if(error){setError('E-mail ou senha inválidos.');setLoading(false);return}navigate('/app');}
  return <div className="auth"><div className="auth-card"><Logo/><h1>Bem-vindo de volta</h1><p>Entre para acessar o sistema.</p><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="form-error">{error}</div>}<button className="hero-btn full" disabled={loading}>{loading?'Entrando...':'Entrar'}</button></form><button className="back" onClick={()=>navigate('/')}>Voltar para o início</button></div></div>
}

function SessionGate() {
  const [state,setState]=useState<'loading'|'ready'|'none'>('loading')

  useEffect(()=>{
    let alive=true
    async function load(){
      if(!supabase){if(alive)setState('none');return}
      const{data:{session}}=await supabase.auth.getSession()
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
  const [state,setState]=useState<'loading'|'allowed'|'denied'>('loading')

  useEffect(()=>{
    let alive=true
    async function load(){
      if(!supabase){if(alive)setState('denied');return}
      const{data:{user}}=await supabase.auth.getUser()
      if(!user){if(alive)setState('denied');return}
      const{data:profile}=await supabase.from('profiles').select('is_superadmin').eq('id',user.id).maybeSingle()
      const jwtAdmin=user.app_metadata?.role==='superadmin'||user.app_metadata?.is_superadmin===true
      const isAdmin=Boolean(profile?.is_superadmin||jwtAdmin)
      if(alive)setState(isAdmin===admin?'allowed':'denied')
    }
    load()
    return()=>{alive=false}
  },[admin])

  if(state==='loading')return <div className="auth"><div className="panel">Carregando acesso...</div></div>
  if(state==='denied')return <Navigate to={admin?'/dashboard':'/admin/dashboard'} replace/>
  return <Outlet/>
}

function AdminLayout(){
  const navigate=useNavigate()
  async function logout(){await supabase?.auth.signOut();navigate('/login')}
  return <div className="layout"><aside><Logo/><div className="company"><strong>Administração</strong><small>Visão global da plataforma</small></div><nav className="sidebar-nav">{adminNav.map(([path,label,Icon])=><NavLink key={path} to={path}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="profile"><b>SA</b><span>Superadmin<small>Controle global</small></span><button onClick={logout} title="Sair"><LogOut size={15}/></button></div></aside><main><header><strong>Consulta Pro</strong><span>Superadmin</span></header><Outlet/></main></div>
}

function Metric({label,value,icon:Icon}: {label:string;value:string|number;icon?:Icon}){return <div className="card">{Icon&&<Icon size={17}/>}<span>{label}</span><b>{value}</b></div>}

function AdminDashboard(){
  const{companies}=useTenant(); const[stats,setStats]=useState({messages:0,dispatches:0,patients:0,appointments:0})
  useEffect(()=>{async function load(){if(!supabase)return;const count=async(table:string)=>{const r=await supabase!.from(table).select('*',{count:'exact',head:true});return r.count||0};setStats({messages:await count('whatsapp_messages'),dispatches:await count('automation_dispatches'),patients:await count('patients'),appointments:await count('appointments')})}load()},[])
  return <div className="content"><div className="head"><div><h1>Visão geral</h1><p>Operação global do Consulta Pro.</p></div><NavLink className="hero-btn" to="/admin/empresas/nova"><Plus size={16}/> Nova empresa</NavLink></div><div className="metrics"><Metric label="Empresas" value={companies.length} icon={Building2}/><Metric label="Pacientes" value={stats.patients} icon={Users}/><Metric label="Atendimentos" value={stats.appointments} icon={CalendarDays}/><Metric label="Mensagens" value={stats.messages} icon={MessageCircle}/></div><div className="grid"><section className="panel"><h2>Empresas recentes</h2>{companies.length===0?<Empty text="Nenhuma empresa cadastrada."/>:companies.slice(0,8).map(c=><div className="row" key={c.id}><Building2 size={17}/><span><b>{c.name}</b><small>{c.cnpj||'CNPJ não informado'}</small></span><NavLink to={'/admin/empresas/'+c.id}>Gerenciar</NavLink></div>)}</section><section className="panel"><h2>Mensageria</h2><div className="wa"><MessageCircle size={20}/><span><b>{stats.dispatches} automações registradas</b><small>Eventos de disparo no banco</small></span></div><div className="stats"><div><b>{stats.messages}</b><small>mensagens</small></div><div><b>{companies.length}</b><small>empresas</small></div></div></section></div></div>
}

function AdminCompanies(){
  const{companies,refresh}=useTenant(); const navigate=useNavigate()
  return <div className="content"><div className="head"><div><h1>Empresas</h1><p>Todos os consultórios e clínicas da plataforma.</p></div><button className="hero-btn" onClick={()=>navigate('/admin/empresas/nova')}><Plus size={16}/> Nova empresa</button></div><section className="panel">{companies.length===0?<div className="empty-box"><Building2 size={35}/><h2>Nenhuma empresa cadastrada</h2><p>Crie o primeiro consultório para começar.</p><button className="hero-btn" onClick={()=>navigate('/admin/empresas/nova')}>Criar empresa</button></div>:companies.map(c=><div className="row" key={c.id}><Building2 size={18}/><span><b>{c.name}</b><small>{c.cnpj||'CNPJ não informado'}</small></span><i>Ativa</i><NavLink to={'/admin/empresas/'+c.id}>Gerenciar</NavLink></div>)}</section></div>
}

function NewCompany(){
  const navigate=useNavigate();const{refresh}=useTenant();const[name,setName]=useState('');const[legal,setLegal]=useState('');const[cnpj,setCnpj]=useState('');const[phone,setPhone]=useState('');const[email,setEmail]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('')
  async function submit(e:React.FormEvent){e.preventDefault();if(!supabase||!name.trim())return;setBusy(true);setError('');const{error}=await supabase.rpc('superadmin_create_company',{company_name:name.trim(),legal_name:legal||null,cnpj:cnpj||null,phone:phone||null,email:email||null});if(error)setError(error.message);else{await refresh();navigate('/admin/empresas')}setBusy(false)}
  return <div className="content"><div className="head"><div><button className="back-link" onClick={()=>navigate('/admin/empresas')}><ArrowLeft size={15}/> Empresas</button><h1>Nova empresa</h1><p>Cadastre um novo tenant do Consulta Pro.</p></div></div><section className="panel"><form className="form-grid" onSubmit={submit}><label>Nome fantasia*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Razão social<input value={legal} onChange={e=>setLegal(e.target.value)}/></label><label>CNPJ<input value={cnpj} onChange={e=>setCnpj(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>{error&&<div className="form-error">{error}</div>}<div><button className="hero-btn" disabled={busy}>{busy?'Criando...':'Criar empresa'} <CheckCircle2 size={16}/></button></div></form></section></div>
}

function CompanyDetail(){
  const{id}=useParams();
  const{companies}=useTenant();
  const c=companies.find(x=>x.id===id);
  const navigate=useNavigate();
  const[users,setUsers]=useState<any[]>([]);
  const[userName,setUserName]=useState('');
  const[userEmail,setUserEmail]=useState('');
  const[userPassword,setUserPassword]=useState('');
  const[userRole,setUserRole]=useState<'owner'|'admin'>('owner');
  const[userBusy,setUserBusy]=useState(false);
  const[userError,setUserError]=useState('');
  const[userSuccess,setUserSuccess]=useState('');

  async function loadUsers(){
    if(!supabase||!id)return;
    const{data,error}=await supabase
      .from('company_users')
      .select('user_id,role,status,created_at,profiles(full_name)')
      .eq('company_id',id)
      .order('created_at');
    if(error)console.error('Erro ao carregar usuários da empresa:',error);
    setUsers(data||[]);
  }

  useEffect(()=>{loadUsers()},[id]);

  async function createCompanyUser(e:React.FormEvent){
    e.preventDefault();
    if(!supabase||!id)return;
    setUserBusy(true);
    setUserError('');
    setUserSuccess('');
    const{data,error}=await supabase.functions.invoke('superadmin-create-company-user',{
      body:{company_id:id,full_name:userName,email:userEmail,password:userPassword,role:userRole}
    });
    if(error){
      setUserError(error.message||'Não foi possível criar o acesso.');
    }else if(data?.error){
      setUserError(data.error);
    }else{
      setUserSuccess(`Acesso criado para ${userEmail}. O usuário já pode entrar em /login.`);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('owner');
      await loadUsers();
    }
    setUserBusy(false);
  }

  if(!c)return <div className="content"><section className="panel"><CircleAlert size={30}/><h2>Empresa não encontrada</h2><button className="hero-btn" onClick={()=>navigate('/admin/empresas')}>Voltar</button></section></div>;

  return <div className="content">
    <div className="head">
      <div>
        <button className="back-link" onClick={()=>navigate('/admin/empresas')}><ArrowLeft size={15}/> Empresas</button>
        <h1>{c.name}</h1>
        <p>{c.cnpj||'CNPJ não informado'}</p>
      </div>
      <button className="hero-btn" onClick={()=>navigate('/dashboard')}><LayoutDashboard size={16}/> Abrir operação</button>
    </div>

    <div className="metrics">
      <Metric label="Status" value="Ativa"/>
      <Metric label="Usuários" value={users.length}/>
      <Metric label="Profissionais" value="—"/>
      <Metric label="Pacientes" value="—"/>
    </div>

    <div className="grid">
      <section className="panel">
        <h2>Dados da empresa</h2>
        <div className="row"><span><b>Razão social</b><small>{c.legal_name||'Não informada'}</small></span></div>
        <div className="row"><span><b>Telefone</b><small>{c.phone||'Não informado'}</small></span></div>
        <div className="row"><span><b>E-mail</b><small>{c.email||'Não informado'}</small></span></div>
      </section>
      <section className="panel">
        <h2>Integrações</h2>
        <div className="wa"><Wifi size={20}/><span><b>WhatsApp</b><small>Configure a integração no contexto da empresa.</small></span></div>
      </section>
    </div>

    <section className="panel">
      <div className="head">
        <div><h2>Acesso da empresa</h2><p>Crie o primeiro usuário que poderá entrar no Consulta Pro e operar este consultório.</p></div>
      </div>
      <form className="form-grid" onSubmit={createCompanyUser}>
        <label>Nome completo*<input required value={userName} onChange={e=>setUserName(e.target.value)} placeholder="Responsável pelo consultório"/></label>
        <label>E-mail de login*<input required type="email" value={userEmail} onChange={e=>setUserEmail(e.target.value)} placeholder="responsavel@consultorio.com"/></label>
        <label>Senha inicial*<input required minLength={8} type="password" value={userPassword} onChange={e=>setUserPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label>
        <label>Perfil*<select value={userRole} onChange={e=>setUserRole(e.target.value as 'owner'|'admin')}><option value="owner">Owner — acesso total</option><option value="admin">Admin — gestão da empresa</option></select></label>
        {userError&&<div className="form-error">{userError}</div>}
        {userSuccess&&<div className="form-success">{userSuccess}</div>}
        <div><button className="hero-btn" disabled={userBusy}>{userBusy?'Criando acesso...':'Criar acesso'} <CheckCircle2 size={16}/></button></div>
      </form>
    </section>

    <section className="panel">
      <h2>Usuários vinculados</h2>
      {users.length===0?<div className="empty-box"><Users size={30}/><p>Nenhum usuário possui acesso a esta empresa.</p></div>:users.map(u=><div className="row" key={u.user_id}><UserRound size={18}/><span><b>{u.profiles?.full_name||'Usuário'}</b><small>{u.role==='owner'?'Owner':'Admin'} · criado em {new Date(u.created_at).toLocaleDateString('pt-BR')}</small></span><i>{u.status}</i></div>)}
    </section>
  </div>
}

function Permissions(){const roles=[['Owner','Acesso total à empresa'],['Admin','Gestão operacional e usuários'],['Atendente','Agenda, pacientes e mensagens'],['Profissional','Agenda e próprios atendimentos']];return <div className="content"><div className="head"><div><h1>Permissões</h1><p>Perfis padrão do Consulta Pro.</p></div></div><section className="panel">{roles.map(([role,desc])=><div className="row" key={role}><ShieldCheck size={18}/><span><b>{role}</b><small>{desc}</small></span><CheckCircle2 size={17}/></div>)}</section></div>}

function AdminUsers(){
  const[users,setUsers]=useState<any[]>([]); const[loading,setLoading]=useState(true); const[error,setError]=useState('');
  async function load(){
    if(!supabase)return;
    setLoading(true); setError('');
    const{data,error}=await supabase.from('company_users').select('user_id,company_id,role,status,created_at,profiles(full_name),companies(name)').order('created_at',{ascending:false});
    if(error)setError(error.message); setUsers(data||[]); setLoading(false);
  }
  useEffect(()=>{load()},[]);
  return <div className="content"><div className="head"><div><h1>Usuários</h1><p>Acessos vinculados aos consultórios da plataforma.</p></div></div><section className="panel">{loading?<div className="empty-box">Carregando usuários...</div>:error?<div className="form-error">{error}</div>:users.length===0?<div className="empty-box"><Users size={35}/><h2>Nenhum usuário</h2><p>Os acessos criados para as empresas aparecerão aqui.</p></div>:users.map(u=><div className="row" key={u.user_id}><UserRound size={18}/><span><b>{u.profiles?.full_name||'Usuário'}</b><small>{u.companies?.name||'Empresa'} · {u.role==='owner'?'Owner':u.role==='admin'?'Admin':u.role}</small></span><i>{u.status}</i><NavLink to={'/admin/empresas/'+u.company_id}>Gerenciar empresa</NavLink></div>)}</section></div>
}

function AdminMessages(){const[period,setPeriod]=useState('30');const[count,setCount]=useState(0);useEffect(()=>{async function load(){if(!supabase)return;const since=new Date(Date.now()-Number(period)*86400000).toISOString();const{count}=await supabase.from('whatsapp_messages').select('*',{count:'exact',head:true}).gte('created_at',since);setCount(count||0)}load()},[period]);return <div className="content"><div className="head"><div><h1>Mensagens</h1><p>Mensageria global da plataforma.</p></div><select className="company-select" value={period} onChange={e=>setPeriod(e.target.value)}><option value="1">Hoje</option><option value="7">7 dias</option><option value="30">30 dias</option></select></div><div className="metrics"><Metric label="Mensagens no período" value={count} icon={MessageCircle}/><Metric label="Status" value="Monitorando" icon={Activity}/></div><section className="panel"><h2>Visão de operação</h2><p>Os eventos reais do WhatsApp serão consolidados aqui conforme as integrações forem utilizadas.</p></section></div>}

function AdminPlaceholder({title,description,icon:Icon}:{title:string;description:string;icon:Icon}){return <div className="content"><div className="head"><div><h1>{title}</h1><p>{description}</p></div></div><section className="panel placeholder"><Icon size={42}/><h2>{title}</h2><p>A estrutura administrativa está pronta para os dados reais do Supabase.</p></section></div>}

function Empty({text}:{text:string}){return <div className="empty-box"><p>{text}</p></div>}


function TenantPage({title,description,children,action}:{title:string;description:string;children?:React.ReactNode;action?:React.ReactNode}){return <div className="content"><div className="head"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>{children}</div>}

function PatientsPage(){
  const{activeCompany}=useTenant(); const[items,setItems]=useState<any[]>([]); const[loading,setLoading]=useState(true); const[open,setOpen]=useState(false); const[name,setName]=useState(''); const[phone,setPhone]=useState(''); const[whatsapp,setWhatsapp]=useState(''); const[error,setError]=useState('');
  async function load(){if(!supabase||!activeCompany)return;setLoading(true);const{data}=await supabase.from('patients').select('*').eq('company_id',activeCompany.id).order('full_name');setItems(data||[]);setLoading(false)}
  useEffect(()=>{load()},[activeCompany?.id]);
  async function save(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setError('');const{error}=await supabase.from('patients').insert({company_id:activeCompany.id,full_name:name,phone,whatsapp});if(error)setError(error.message);else{setName('');setPhone('');setWhatsapp('');setOpen(false);load()}}
  return <TenantPage title="Pacientes" description="Cadastro e histórico dos pacientes." action={<button className="hero-btn" onClick={()=>setOpen(true)}><Plus size={16}/> Novo paciente</button>}><section className="panel">{loading?<div className="empty-box">Carregando...</div>:items.length===0?<div className="empty-box"><Users size={35}/><h2>Nenhum paciente</h2><p>Cadastre o primeiro paciente deste consultório.</p></div>:items.map(p=><div className="row" key={p.id}><UserRound size={18}/><span><b>{p.full_name}</b><small>{p.whatsapp||p.phone||'Sem telefone'}</small></span><i>{p.status==='active'?'Ativo':'Inativo'}</i></div>)}</section>{open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><h2>Novo paciente</h2><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid"><label>Nome completo*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>WhatsApp<input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}/></label></div>{error&&<div className="form-error">{error}</div>}<button className="hero-btn">Salvar paciente</button></form></div>}</TenantPage>
}

function ProfessionalsPage(){
  const{activeCompany}=useTenant();const[items,setItems]=useState<any[]>([]);const[loading,setLoading]=useState(true);const[open,setOpen]=useState(false);const[name,setName]=useState('');const[specialty,setSpecialty]=useState('');const[registration,setRegistration]=useState('');
  async function load(){if(!supabase||!activeCompany)return;setLoading(true);const{data}=await supabase.from('professionals').select('*').eq('company_id',activeCompany.id).order('name');setItems(data||[]);setLoading(false)}
  useEffect(()=>{load()},[activeCompany?.id]);
  async function save(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;await supabase.from('professionals').insert({company_id:activeCompany.id,name,specialty,professional_registration:registration});setName('');setSpecialty('');setRegistration('');setOpen(false);load()}
  return <TenantPage title="Profissionais" description="Profissionais que realizam os atendimentos." action={<button className="hero-btn" onClick={()=>setOpen(true)}><Plus size={16}/> Novo profissional</button>}><section className="panel">{loading?<div className="empty-box">Carregando...</div>:items.length===0?<div className="empty-box"><UserRound size={35}/><h2>Nenhum profissional</h2><p>Funciona para consultórios com um ou vários profissionais.</p></div>:items.map(p=><div className="row" key={p.id}><UserRound size={18}/><span><b>{p.name}</b><small>{p.specialty||'Especialidade não informada'} {p.professional_registration?'· '+p.professional_registration:''}</small></span><i>{p.status==='active'?'Ativo':'Inativo'}</i></div>)}</section>{open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><h2>Novo profissional</h2><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid"><label>Nome*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Especialidade<input value={specialty} onChange={e=>setSpecialty(e.target.value)}/></label><label>Registro<input value={registration} onChange={e=>setRegistration(e.target.value)}/></label></div><button className="hero-btn">Salvar profissional</button></form></div>}</TenantPage>
}

function AgendaPage(){
  const{activeCompany}=useTenant();const[items,setItems]=useState<any[]>([]);const[patients,setPatients]=useState<any[]>([]);const[pros,setPros]=useState<any[]>([]);const[open,setOpen]=useState(false);const[patient,setPatient]=useState('');const[professional,setProfessional]=useState('');const[date,setDate]=useState('');const[time,setTime]=useState('');const[duration,setDuration]=useState('60');const[error,setError]=useState('');
  async function load(){if(!supabase||!activeCompany)return;const[a,b,c]=await Promise.all([supabase.from('appointments').select('*,patients(full_name),professionals(name)').eq('company_id',activeCompany.id).order('starts_at'),supabase.from('patients').select('id,full_name').eq('company_id',activeCompany.id).eq('status','active').order('full_name'),supabase.from('professionals').select('id,name').eq('company_id',activeCompany.id).eq('status','active').order('name')]);setItems(a.data||[]);setPatients(b.data||[]);setPros(c.data||[])}
  useEffect(()=>{load()},[activeCompany?.id]);
  async function save(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setError('');const start=new Date(date+'T'+time);const end=new Date(start.getTime()+Number(duration)*60000);const{data:conflict}=await supabase.from('appointments').select('id').eq('company_id',activeCompany.id).eq('professional_id',professional).lt('starts_at',end.toISOString()).gt('ends_at',start.toISOString()).limit(1);if(conflict&&conflict.length){setError('Este profissional já possui atendimento neste horário.');return}const{error}=await supabase.from('appointments').insert({company_id:activeCompany.id,patient_id:patient,professional_id:professional,starts_at:start.toISOString(),ends_at:end.toISOString(),status:'scheduled'});if(error)setError(error.message);else{setOpen(false);load()}}
  return <TenantPage title="Agenda" description="Atendimentos por dia, profissional e paciente." action={<button className="hero-btn" onClick={()=>setOpen(true)}><Plus size={16}/> Novo atendimento</button>}><section className="panel">{items.length===0?<div className="empty-box"><CalendarDays size={35}/><h2>Agenda vazia</h2><p>Crie o primeiro atendimento.</p></div>:items.map(a=><div className="row" key={a.id}><CalendarDays size={18}/><span><b>{new Date(a.starts_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</b><small>{a.patients?.full_name||'Paciente'} · {a.professionals?.name||'Profissional'}</small></span><i>{a.status}</i></div>)}</section>{open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><h2>Novo atendimento</h2><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid"><label>Paciente*<select required value={patient} onChange={e=>setPatient(e.target.value)}><option value="">Selecione</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label><label>Profissional*<select required value={professional} onChange={e=>setProfessional(e.target.value)}><option value="">Selecione</option>{pros.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Data*<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Hora*<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Duração (min)<input type="number" min="15" step="15" value={duration} onChange={e=>setDuration(e.target.value)}/></label></div>{error&&<div className="form-error">{error}</div>}<button className="hero-btn">Agendar</button></form></div>}</TenantPage>
}

function WhatsAppPage(){const{activeCompany}=useTenant();const[item,setItem]=useState<any>(null);useEffect(()=>{async function load(){if(!supabase||!activeCompany)return;const{data}=await supabase.from('whatsapp_integrations').select('*').eq('company_id',activeCompany.id).maybeSingle();setItem(data)}load()},[activeCompany?.id]);return <TenantPage title="WhatsApp" description="Número de WhatsApp da empresa e estado da integração."><section className="panel">{item?<div className="row"><MessageCircle size={20}/><span><b>{item.phone_number||'Número não informado'}</b><small>{item.instance_name||'Instância'} · {item.provider}</small></span><i>{item.status}</i></div>:<div className="empty-box"><MessageCircle size={35}/><h2>Nenhuma integração conectada</h2><p>O número pertence à empresa e poderá ser conectado à Evolution API.</p></div>}</section></TenantPage>}

function AutomationsPage(){const{activeCompany}=useTenant();const[items,setItems]=useState<any[]>([]);useEffect(()=>{async function load(){if(!supabase||!activeCompany)return;const{data}=await supabase.from('automations').select('*').eq('company_id',activeCompany.id).order('name');setItems(data||[])}load()},[activeCompany?.id]);return <TenantPage title="Automações" description="Regras que executam lembretes e mensagens automaticamente." action={<button className="hero-btn"><Plus size={16}/> Nova automação</button>}><section className="panel">{items.length===0?<div className="empty-box"><Bot size={35}/><h2>Nenhuma automação</h2><p>Crie o lembrete de consulta de 24 horas quando o WhatsApp estiver conectado.</p></div>:items.map(a=><div className="row" key={a.id}><Bot size={18}/><span><b>{a.name}</b><small>{a.advance_minutes} min antes · {a.channel}</small></span><i>{a.enabled?'Ativa':'Inativa'}</i></div>)}</section></TenantPage>}

function TenantLayout(){
  const{activeCompany,companies,setActiveCompany}=useTenant();const navigate=useNavigate()
  async function logout(){await supabase?.auth.signOut();navigate('/login')}
  if(!activeCompany)return <div className="content"><section className="panel"><Building2 size={36}/><h2>Nenhuma empresa vinculada</h2><p>Seu usuário ainda não possui um consultório associado.</p></section></div>
  return <div className="layout"><aside><Logo/><div className="company"><strong>{activeCompany.name}</strong><small>Tenant ativo</small></div>{companies.length>1&&<select className="company-select" value={activeCompany.id} onChange={e=>{const c=companies.find(x=>x.id===e.target.value);if(c)setActiveCompany(c)}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}<nav className="sidebar-nav">{tenantNav.map(([path,label,Icon])=><NavLink key={path} to={path}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="profile"><b>U</b><span>Conta<small>Tenant protegido por RLS</small></span><button onClick={logout}><LogOut size={15}/></button></div></aside><main><header><strong>{activeCompany.name}</strong><span>Operação</span></header><Outlet/></main></div>
}

function TenantDashboard(){const{activeCompany}=useTenant();return <div className="content"><div className="head"><div><h1>Dashboard</h1><p>{activeCompany?.name}</p></div><button className="hero-btn"><Plus size={16}/> Novo atendimento</button></div><div className="metrics"><Metric label="Consultas hoje" value="0"/><Metric label="Confirmadas" value="0"/><Metric label="Pendentes" value="0"/><Metric label="Realizadas" value="0"/></div><div className="grid"><section className="panel"><h2>Próximos atendimentos</h2><Empty text="Os atendimentos reais aparecerão aqui." /></section><section className="panel"><h2>WhatsApp</h2><div className="wa"><MessageCircle size={20}/><span><b>Nenhuma integração conectada</b><small>Configure o número da empresa.</small></span></div></section></div></div>}

export default function App(){
  return <Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={<Login/>}/>

    <Route element={<SessionGate/>}>
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
        <Route path="configuracoes" element={<AdminPlaceholder title="Configurações" description="Preferências e dados da empresa." icon={Settings}/>}/>
        </Route>
      </Route>
    </Route>

    <Route path="/app" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}

