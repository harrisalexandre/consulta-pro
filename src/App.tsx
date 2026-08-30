import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import {
  Activity, ArrowLeft, BarChart3, Bot, Building2, CalendarDays, CheckCircle2,
  ChevronRight, CircleAlert, Eye, EyeOff, LayoutDashboard, LogIn, LogOut, MessageCircle,
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
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [showPassword,setShowPassword]=useState(false); const [error,setError]=useState(''); const [loading,setLoading]=useState(false)
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);if(!supabase){setError('Supabase não configurado.');setLoading(false);return}const{error}=await supabase.auth.signInWithPassword({email,password});if(error){setError('E-mail ou senha inválidos.');setLoading(false);return}navigate('/app');}
  return <div className="auth"><div className="auth-card"><Logo/><h1>Bem-vindo de volta</h1><p>Entre para acessar o sistema.</p><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<div className="password-wrap"><input type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" className="icon-btn" title={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>{error&&<div className="form-error">{error}</div>}<button className="hero-btn full" disabled={loading}>{loading?'Entrando...':'Entrar'}</button></form><button className="back" onClick={()=>navigate('/')}>Voltar para o início</button></div></div>
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
  const{companies,setActiveCompany}=useTenant();
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
  const[editing,setEditing]=useState<any>(null);
  const[editName,setEditName]=useState('');
  const[editRole,setEditRole]=useState<'owner'|'admin'>('owner');
  const[editStatus,setEditStatus]=useState<'active'|'inactive'>('active');
  const[resetPassword,setResetPassword]=useState('');
  const[showPassword,setShowPassword]=useState(false);
  const[editBusy,setEditBusy]=useState(false);

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

  function startEdit(u:any){setEditing(u);setEditName(u.profiles?.full_name||'');setEditRole(u.role==='admin'?'admin':'owner');setEditStatus(u.status==='inactive'?'inactive':'active');setResetPassword('');setShowPassword(false);setUserError('');}
  async function saveEdit(e:React.FormEvent){e.preventDefault();if(!supabase||!id||!editing)return;setEditBusy(true);setUserError('');setUserSuccess('');const body:any={user_id:editing.user_id,company_id:id,full_name:editName,role:editRole,status:editStatus};if(resetPassword)body.password=resetPassword;const{data,error}=await supabase.functions.invoke('superadmin-update-company-user',{body});if(error)setUserError(error.message||'Não foi possível atualizar o usuário.');else if(data?.error)setUserError(data.error);else{setUserSuccess('Usuário atualizado com sucesso.');setEditing(null);await loadUsers()}setEditBusy(false)}

  if(!c)return <div className="content"><section className="panel"><CircleAlert size={30}/><h2>Empresa não encontrada</h2><button className="hero-btn" onClick={()=>navigate('/admin/empresas')}>Voltar</button></section></div>;

  return <div className="content">
    <div className="head">
      <div>
        <button className="back-link" onClick={()=>navigate('/admin/empresas')}><ArrowLeft size={15}/> Empresas</button>
        <h1>{c.name}</h1>
        <p>{c.cnpj||'CNPJ não informado'}</p>
      </div>
      <button className="hero-btn" onClick={()=>{setActiveCompany(c);navigate('/dashboard')}}><LayoutDashboard size={16}/> Abrir operação</button>
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
      {users.length===0?<div className="empty-box"><Users size={30}/><p>Nenhum usuário possui acesso a esta empresa.</p></div>:users.map(u=><div className="row" key={u.user_id}><UserRound size={18}/><span><b>{u.profiles?.full_name||'Usuário'}</b><small>{u.role==='owner'?'Owner':'Admin'} · criado em {new Date(u.created_at).toLocaleDateString('pt-BR')}</small></span><i>{u.status}</i><button className="back-link" onClick={()=>startEdit(u)}>Editar</button></div>)}
      {editing&&<div className="modal-backdrop"><form className="modal panel" onSubmit={saveEdit}><div className="head"><div><h2>Editar acesso</h2><p>{editing.profiles?.full_name||'Usuário'}</p></div><button type="button" className="icon-btn" onClick={()=>setEditing(null)}><XCircle size={18}/></button></div><div className="form-grid"><label>Nome completo*<input required value={editName} onChange={e=>setEditName(e.target.value)}/></label><label>Perfil<select value={editRole} onChange={e=>setEditRole(e.target.value as 'owner'|'admin')}><option value="owner">Owner — acesso total</option><option value="admin">Admin — gestão da empresa</option></select></label><label>Status<select value={editStatus} onChange={e=>setEditStatus(e.target.value as 'active'|'inactive')}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label><label>Nova senha (opcional)<div className="password-wrap"><input minLength={8} type={showPassword?'text':'password'} value={resetPassword} onChange={e=>setResetPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/><button type="button" className="icon-btn" title={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label></div>{userError&&<div className="form-error">{userError}</div>}<button className="hero-btn" disabled={editBusy}>{editBusy?'Salvando...':'Salvar alterações'}</button></form></div>}
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
  const{activeCompany}=useTenant(); const[items,setItems]=useState<any[]>([]); const[loading,setLoading]=useState(true);
  const[open,setOpen]=useState(false); const[detail,setDetail]=useState<any>(null); const[history,setHistory]=useState<any[]>([]);
  const[editing,setEditing]=useState<any>(null); const[name,setName]=useState(''); const[phone,setPhone]=useState(''); const[whatsapp,setWhatsapp]=useState(''); const[status,setStatus]=useState<'active'|'inactive'>('active'); const[search,setSearch]=useState(''); const[error,setError]=useState(''); const[busy,setBusy]=useState(false);
  async function load(){if(!supabase||!activeCompany)return;setLoading(true);const{data,error}=await supabase.from('patients').select('*').eq('company_id',activeCompany.id).order('full_name');if(error)setError(error.message);setItems(data||[]);setLoading(false)}
  useEffect(()=>{load()},[activeCompany?.id]);
  function openNew(){setEditing(null);setName('');setPhone('');setWhatsapp('');setStatus('active');setError('');setOpen(true)}
  function openEdit(p:any){setEditing(p);setName(p.full_name||'');setPhone(p.phone||'');setWhatsapp(p.whatsapp||'');setStatus(p.status==='inactive'?'inactive':'active');setError('');setOpen(true)}
  async function openDetail(p:any){setDetail(p);setHistory([]);setError('');if(!supabase||!activeCompany)return;const{data,error}=await supabase.from('appointments').select('*,professionals(name)').eq('company_id',activeCompany.id).eq('patient_id',p.id).order('starts_at',{ascending:false});if(error)setError(error.message);setHistory(data||[])}
  async function save(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setBusy(true);setError('');const payload={full_name:name.trim(),phone:phone.trim()||null,whatsapp:whatsapp.trim()||null,status};const result=editing?await supabase.from('patients').update(payload).eq('id',editing.id).eq('company_id',activeCompany.id):await supabase.from('patients').insert({company_id:activeCompany.id,...payload});if(result.error)setError(result.error.message);else{setOpen(false);await load()}setBusy(false)}
  const filtered=items.filter(p=>String(p.full_name||'').toLowerCase().includes(search.toLowerCase())||String(p.whatsapp||p.phone||'').includes(search));
  return <TenantPage title="Pacientes" description="Cadastro, contato e histórico dos pacientes." action={<button className="hero-btn" onClick={openNew}><Plus size={16}/> Novo paciente</button>}>
    <section className="panel"><div className="head"><div><h2>Pacientes</h2><p>{items.length} cadastro(s)</p></div><input style={{maxWidth:280}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."/></div>
    {error&&<div className="form-error">{error}</div>}
    {loading?<div className="empty-box">Carregando...</div>:filtered.length===0?<div className="empty-box"><Users size={35}/><h2>{items.length?'Nenhum resultado':'Nenhum paciente'}</h2><p>{items.length?'Tente outro nome ou telefone.':'Cadastre o primeiro paciente deste consultório.'}</p></div>:filtered.map(p=><div className="row" key={p.id}><UserRound size={18}/><span><b>{p.full_name}</b><small>{p.whatsapp||p.phone||'Sem telefone'}</small></span><i>{p.status==='active'?'Ativo':'Inativo'}</i><button className="back-link" onClick={()=>openDetail(p)}>Ver histórico</button><button className="back-link" onClick={()=>openEdit(p)}>Editar</button></div>)}</section>
    {open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><div><h2>{editing?'Editar paciente':'Novo paciente'}</h2><p>Dados básicos e status do cadastro.</p></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid"><label>Nome completo*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>WhatsApp<input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}/></label>{editing&&<label>Status<select value={status} onChange={e=>setStatus(e.target.value as 'active'|'inactive')}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label>}</div>{error&&<div className="form-error">{error}</div>}<button className="hero-btn" disabled={busy}>{busy?'Salvando...':editing?'Salvar alterações':'Salvar paciente'}</button></form></div>}
    {detail&&<div className="modal-backdrop"><div className="modal panel"><div className="head"><div><h2>{detail.full_name}</h2><p>{detail.whatsapp||detail.phone||'Sem telefone cadastrado'}</p></div><button className="icon-btn" onClick={()=>setDetail(null)}><XCircle size={18}/></button></div><h3>Histórico de atendimentos</h3>{history.length===0?<div className="empty-box">Nenhum atendimento encontrado.</div>:history.map(a=><div className="row" key={a.id}><CalendarDays size={18}/><span><b>{new Date(a.starts_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</b><small>{a.professionals?.name||'Profissional'} · {a.appointment_type||'Consulta'}</small></span><i>{a.status}</i></div>)}<button className="back-link" onClick={()=>setDetail(null)}>Fechar</button></div></div>}
  </TenantPage>
}
function ProfessionalsPage(){
  const{activeCompany}=useTenant(); const[items,setItems]=useState<any[]>([]); const[loading,setLoading]=useState(true); const[open,setOpen]=useState(false); const[detail,setDetail]=useState<any>(null); const[history,setHistory]=useState<any[]>([]);
  const[editing,setEditing]=useState<any>(null); const[name,setName]=useState(''); const[specialty,setSpecialty]=useState(''); const[registration,setRegistration]=useState(''); const[status,setStatus]=useState<'active'|'inactive'>('active'); const[search,setSearch]=useState(''); const[error,setError]=useState(''); const[busy,setBusy]=useState(false);
  async function load(){if(!supabase||!activeCompany)return;setLoading(true);const{data,error}=await supabase.from('professionals').select('*').eq('company_id',activeCompany.id).order('name');if(error)setError(error.message);setItems(data||[]);setLoading(false)}
  useEffect(()=>{load()},[activeCompany?.id]);
  function openNew(){setEditing(null);setName('');setSpecialty('');setRegistration('');setStatus('active');setError('');setOpen(true)}
  function openEdit(p:any){setEditing(p);setName(p.name||'');setSpecialty(p.specialty||'');setRegistration(p.professional_registration||'');setStatus(p.status==='inactive'?'inactive':'active');setError('');setOpen(true)}
  async function openDetail(p:any){setDetail(p);setHistory([]);if(!supabase||!activeCompany)return;const{data,error}=await supabase.from('appointments').select('*,patients(full_name)').eq('company_id',activeCompany.id).eq('professional_id',p.id).order('starts_at',{ascending:false});if(error)setError(error.message);setHistory(data||[])}
  async function save(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setBusy(true);setError('');const payload={name:name.trim(),specialty:specialty.trim()||null,professional_registration:registration.trim()||null,status};const result=editing?await supabase.from('professionals').update(payload).eq('id',editing.id).eq('company_id',activeCompany.id):await supabase.from('professionals').insert({company_id:activeCompany.id,...payload});if(result.error)setError(result.error.message);else{setOpen(false);await load()}setBusy(false)}
  const filtered=items.filter(p=>String(p.name||'').toLowerCase().includes(search.toLowerCase())||String(p.specialty||'').toLowerCase().includes(search.toLowerCase())||String(p.professional_registration||'').toLowerCase().includes(search.toLowerCase()));
  return <TenantPage title="Profissionais" description="Equipe, especialidades e agenda de atendimento." action={<button className="hero-btn" onClick={openNew}><Plus size={16}/> Novo profissional</button>}>
    <section className="panel"><div className="head"><div><h2>Equipe</h2><p>{items.length} profissional(is)</p></div><input style={{maxWidth:300}} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome, especialidade..."/></div>
    {error&&<div className="form-error">{error}</div>}{loading?<div className="empty-box">Carregando...</div>:filtered.length===0?<div className="empty-box"><UserRound size={35}/><h2>{items.length?'Nenhum resultado':'Nenhum profissional'}</h2><p>{items.length?'Tente outro termo.':'Cadastre o primeiro profissional deste consultório.'}</p></div>:filtered.map(p=><div className="row" key={p.id}><UserRound size={18}/><span><b>{p.name}</b><small>{p.specialty||'Especialidade não informada'} {p.professional_registration?'· '+p.professional_registration:''}</small></span><i>{p.status==='active'?'Ativo':'Inativo'}</i><button className="back-link" onClick={()=>openDetail(p)}>Ver agenda</button><button className="back-link" onClick={()=>openEdit(p)}>Editar</button></div>)}</section>
    {open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><div><h2>{editing?'Editar profissional':'Novo profissional'}</h2><p>Dados usados na Agenda e nos atendimentos.</p></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid"><label>Nome*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Especialidade<input value={specialty} onChange={e=>setSpecialty(e.target.value)}/></label><label>Registro profissional<input value={registration} onChange={e=>setRegistration(e.target.value)}/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value as 'active'|'inactive')}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label></div>{error&&<div className="form-error">{error}</div>}<button className="hero-btn" disabled={busy}>{busy?'Salvando...':editing?'Salvar alterações':'Salvar profissional'}</button></form></div>}
    {detail&&<div className="modal-backdrop"><div className="modal panel"><div className="head"><div><h2>{detail.name}</h2><p>{detail.specialty||'Especialidade não informada'}</p></div><button className="icon-btn" onClick={()=>setDetail(null)}><XCircle size={18}/></button></div><h3>Atendimentos</h3>{history.length===0?<div className="empty-box">Nenhum atendimento encontrado.</div>:history.map(a=><div className="row" key={a.id}><CalendarDays size={18}/><span><b>{new Date(a.starts_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</b><small>{a.patients?.full_name||'Paciente'} · {a.appointment_type||'Consulta'}</small></span><i>{a.status}</i></div>)}<button className="back-link" onClick={()=>setDetail(null)}>Fechar</button></div></div>}
  </TenantPage>
}

function AgendaPage(){
  const{activeCompany}=useTenant();
  const[today,setToday]=useState(()=>new Date());
  const[items,setItems]=useState<any[]>([]); const[patients,setPatients]=useState<any[]>([]); const[pros,setPros]=useState<any[]>([]);
  const[open,setOpen]=useState(false); const[editing,setEditing]=useState<any>(null);
  const[patient,setPatient]=useState('');const[professional,setProfessional]=useState('');const[date,setDate]=useState('');const[time,setTime]=useState('');const[duration,setDuration]=useState('60');const[type,setType]=useState('Consulta');const[notes,setNotes]=useState('');const[status,setStatus]=useState('scheduled');const[error,setError]=useState('');const[loading,setLoading]=useState(true);
  const localKey=(d:Date)=>{const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day};
  const dayKey=localKey(today);
  const dayItems=useMemo(()=>items.filter(a=>localKey(new Date(a.starts_at))===dayKey),[items,dayKey]);

  async function load(){
    if(!supabase||!activeCompany)return;
    setLoading(true);setError('');
    const from=new Date(today);from.setHours(0,0,0,0);const to=new Date(from);to.setDate(to.getDate()+1);
    const[a,b,c]=await Promise.all([
      supabase.from('appointments').select('*,patients(full_name),professionals(name)').eq('company_id',activeCompany.id).gte('starts_at',from.toISOString()).lt('starts_at',to.toISOString()).order('starts_at'),
      supabase.from('patients').select('id,full_name').eq('company_id',activeCompany.id).eq('status','active').order('full_name'),
      supabase.from('professionals').select('id,name').eq('company_id',activeCompany.id).eq('status','active').order('name')
    ]);
    if(a.error)setError(a.error.message);else setItems(a.data||[]);
    if(b.error)setError(b.error.message);else setPatients(b.data||[]);
    if(c.error)setError(c.error.message);else setPros(c.data||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[activeCompany?.id,dayKey]);

  function resetForm(slot?:number){
    setEditing(null);setDate(dayKey);setTime(slot===undefined?'09:00':String(slot).padStart(2,'0')+':00');
    setPatient('');setProfessional('');setDuration('60');setType('Consulta');setNotes('');setStatus('scheduled');setError('');setOpen(true);
  }
  function editAppointment(a:any){
    setEditing(a);const d=new Date(a.starts_at);setDate(localKey(d));setTime(d.toTimeString().slice(0,5));setPatient(a.patient_id);setProfessional(a.professional_id);
    setDuration(String(Math.max(15,Math.round((new Date(a.ends_at).getTime()-d.getTime())/60000))));setType(a.appointment_type||'Consulta');setNotes(a.notes||'');setStatus(a.status||'scheduled');setError('');setOpen(true);
  }
  async function save(e:React.FormEvent){
    e.preventDefault();if(!supabase||!activeCompany)return;
    setError('');
    if(!patient||!professional){setError('Selecione paciente e profissional.');return}
    const start=new Date(date+'T'+time);const end=new Date(start.getTime()+Number(duration)*60000);
    const q=supabase.from('appointments').select('id').eq('company_id',activeCompany.id).eq('professional_id',professional).neq('status','cancelled').lt('starts_at',end.toISOString()).gt('ends_at',start.toISOString());
    const{data:conflict,error:conflictError}=editing?await q.neq('id',editing.id).limit(1):await q.limit(1);
    if(conflictError){setError(conflictError.message);return}
    if(conflict?.length){setError('Este profissional já possui atendimento neste horário.');return}
    const payload={patient_id:patient,professional_id:professional,starts_at:start.toISOString(),ends_at:end.toISOString(),appointment_type:type,notes:notes||null,status};
    const result=editing?await supabase.from('appointments').update(payload).eq('id',editing.id).eq('company_id',activeCompany.id):await supabase.from('appointments').insert({company_id:activeCompany.id,...payload});
    if(result.error)setError(result.error.message);else{setOpen(false);await load()}
  }
  async function changeStatus(id:string,nextStatus:string){if(!supabase||!activeCompany)return;const{error}=await supabase.from('appointments').update({status:nextStatus}).eq('id',id).eq('company_id',activeCompany.id);if(error)setError(error.message);else await load()}
  async function remove(id:string){await changeStatus(id,'cancelled')}
  function shift(days:number){setToday(d=>{const n=new Date(d);n.setDate(n.getDate()+days);return n})}
  return <TenantPage title="Agenda" description="Calendário de atendimentos do consultório." action={<button className="hero-btn" onClick={()=>resetForm()}><Plus size={16}/> Novo atendimento</button>}>
    <section className="panel">
      <div className="agenda-toolbar"><button className="back-link" onClick={()=>setToday(new Date())}>Hoje</button><button className="icon-btn" onClick={()=>shift(-1)} title="Dia anterior"><ArrowLeft size={16}/></button><button className="icon-btn" onClick={()=>shift(1)} title="Próximo dia"><ChevronRight size={16}/></button><h2>{today.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</h2></div>
      {error&&<div className="form-error">{error}</div>}
      {loading?<div className="empty-box">Carregando agenda...</div>:<div className="calendar-day">{Array.from({length:13},(_,i)=>{const hour=8+i;const aps=dayItems.filter(a=>new Date(a.starts_at).getHours()===hour);return <div className="calendar-slot" key={hour}><time>{String(hour).padStart(2,'0')}:00</time><div className="slot-content">{aps.length?aps.map(ap=><div className="appointment-card" key={ap.id}><div><b>{new Date(ap.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {ap.patients?.full_name||'Paciente'}</b><small>{ap.professionals?.name||'Profissional'} · {ap.appointment_type||'Consulta'} · {ap.status}</small></div><span><button className="back-link" onClick={()=>editAppointment(ap)}>Editar</button>{ap.status!=='confirmed'&&ap.status!=='completed'&&<button className="back-link" onClick={()=>changeStatus(ap.id,'confirmed')}>Confirmar</button>}{ap.status==='confirmed'&&<button className="back-link" onClick={()=>changeStatus(ap.id,'completed')}>Concluir</button>}{ap.status!=='cancelled'&&ap.status!=='completed'&&<button className="back-link danger" onClick={()=>remove(ap.id)}>Cancelar</button>}</span></div>):<button className="slot-add" onClick={()=>resetForm(hour)} aria-label={'Agendar às '+hour+':00'}>+</button>}</div></div>})}</div>}
    </section>
    {open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><div><h2>{editing?'Editar atendimento':'Novo atendimento'}</h2><p>{date&&new Date(date+'T12:00').toLocaleDateString('pt-BR')}</p></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid">
      <label>Paciente*<select required value={patient} onChange={e=>setPatient(e.target.value)}><option value="">Selecione</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
      <label>Profissional*<select required value={professional} onChange={e=>setProfessional(e.target.value)}><option value="">Selecione</option>{pros.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Data*<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Hora*<input required type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
      <label>Tipo<select value={type} onChange={e=>setType(e.target.value)}><option>Consulta</option><option>Retorno</option><option>Avaliação</option><option>Online</option></select></label>
      <label>Duração<select value={duration} onChange={e=>setDuration(e.target.value)}><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="completed">Realizado</option><option value="cancelled">Cancelado</option></select></label>
      <label className="full-field">Observações<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label></div>{error&&<div className="form-error">{error}</div>}<button className="hero-btn">{editing?'Salvar alterações':'Agendar'}</button></form></div>}
  </TenantPage>
}
function WhatsAppPage(){
  const{activeCompany}=useTenant();const[item,setItem]=useState<any>(null);const[templates,setTemplates]=useState<any[]>([]);const[messages,setMessages]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[provider,setProvider]=useState('evolution_api');const[instance,setInstance]=useState('');const[phone,setPhone]=useState('');const[status,setStatus]=useState('disconnected');
  const[name,setName]=useState('');const[category,setCategory]=useState('lembrete');const[body,setBody]=useState('');const[editingTemplate,setEditingTemplate]=useState<any>(null);const[templateForm,setTemplateForm]=useState(false);const[error,setError]=useState('');const[success,setSuccess]=useState('');const[filter,setFilter]=useState('');
  async function load(){if(!supabase||!activeCompany)return;setLoading(true);setError('');const[w,t,m]=await Promise.all([supabase.from('whatsapp_integrations').select('*').eq('company_id',activeCompany.id).maybeSingle(),supabase.from('message_templates').select('*').eq('company_id',activeCompany.id).order('created_at',{ascending:false}),supabase.from('whatsapp_messages').select('id,recipient_number,direction,kind,body,status,sent_at,created_at').eq('company_id',activeCompany.id).order('created_at',{ascending:false}).limit(50)]);if(w.error||t.error||m.error)setError(w.error?.message||t.error?.message||m.error?.message||'Não foi possível carregar o WhatsApp.');const d=w.data;setItem(d||null);setProvider(d?.provider||'evolution_api');setInstance(d?.instance_name||'');setPhone(d?.phone_number||'');setStatus(d?.status||'disconnected');setTemplates(t.data||[]);setMessages(m.data||[]);setLoading(false)}
  useEffect(()=>{load()},[activeCompany?.id]);
  async function saveIntegration(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setSaving(true);setError('');setSuccess('');const payload={company_id:activeCompany.id,provider:provider.trim()||'evolution_api',instance_name:instance.trim()||null,phone_number:phone.trim()||null,status};const result=item?await supabase.from('whatsapp_integrations').update(payload).eq('id',item.id).eq('company_id',activeCompany.id):await supabase.from('whatsapp_integrations').insert(payload);if(result.error)setError(result.error.message);else{setSuccess('Configuração salva.');await load()}setSaving(false)}
  function newTemplate(){setEditingTemplate(null);setName('');setCategory('lembrete');setBody('');setError('');setTemplateForm(true)}
  function editTemplate(t:any){setEditingTemplate(t);setName(t.name||'');setCategory(t.category||'geral');setBody(t.body||'');setError('');setTemplateForm(true)}
  async function saveTemplate(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setSaving(true);setError('');const payload={company_id:activeCompany.id,name:name.trim(),category,body:body.trim(),active:true};const result=editingTemplate?await supabase.from('message_templates').update(payload).eq('id',editingTemplate.id).eq('company_id',activeCompany.id):await supabase.from('message_templates').insert(payload);if(result.error)setError(result.error.message);else{setSuccess('Template salvo.');setTemplateForm(false);await load()}setSaving(false)}
  async function toggleTemplate(t:any){if(!supabase||!activeCompany)return;const{error}=await supabase.from('message_templates').update({active:!t.active}).eq('id',t.id).eq('company_id',activeCompany.id);if(error)setError(error.message);else load()}
  const filtered=messages.filter(m=>!filter||String(m.recipient_number||'').includes(filter)||String(m.body||'').toLowerCase().includes(filter.toLowerCase()));
  return <TenantPage title="WhatsApp" description="Integração, mensagens padrão e histórico do consultório.">
    <section className="panel"><div className="head"><div><h2>Conexão</h2><p>Configuração vinculada ao consultório ativo.</p></div><i>{status==='connected'?'Conectado':status==='connecting'?'Conectando':status==='error'?'Erro':'Desconectado'}</i></div>{loading?<div className="empty-box">Carregando...</div>:<form className="form-grid" onSubmit={saveIntegration}><label>Provedor<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="evolution_api">Evolution API</option><option value="other">Outro provedor</option></select></label><label>Instância<input value={instance} onChange={e=>setInstance(e.target.value)} placeholder="consultorio-01"/></label><label>Número<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+55 11 99999-9999"/></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="disconnected">Desconectado</option><option value="connecting">Conectando</option><option value="connected">Conectado</option><option value="error">Erro</option></select></label><div><button className="hero-btn" disabled={saving}>{saving?'Salvando...':'Salvar configuração'} <CheckCircle2 size={16}/></button></div></form>}</section>
    <section className="panel"><div className="head"><div><h2>Mensagens padrão</h2><p>Templates reutilizáveis para automações e atendimento.</p></div><button className="hero-btn" onClick={newTemplate}><Plus size={16}/> Novo template</button></div>{templates.length===0?<div className="empty-box"><MessageCircle size={30}/><h2>Nenhum template</h2><p>Crie a primeira mensagem padrão.</p></div>:templates.map(t=><div className="row" key={t.id}><MessageCircle size={18}/><span><b>{t.name}</b><small>{t.category} · {t.body}</small></span><i>{t.active?'Ativo':'Inativo'}</i><button className="back-link" onClick={()=>editTemplate(t)}>Editar</button><button className="back-link" onClick={()=>toggleTemplate(t)}>{t.active?'Desativar':'Ativar'}</button></div>)}{templateForm&&<form className="form-grid" onSubmit={saveTemplate}><label>Nome*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Categoria<select value={category} onChange={e=>setCategory(e.target.value)}><option value="lembrete">Lembrete</option><option value="confirmacao">Confirmação</option><option value="pos_consulta">Pós-consulta</option><option value="geral">Geral</option></select></label><label className="full-field">Mensagem*<textarea required rows={5} value={body} onChange={e=>setBody(e.target.value)} placeholder="Olá {{paciente}}, sua consulta está marcada para {{data}} às {{hora}}."/></label><div><button className="hero-btn" disabled={saving}>{saving?'Salvando...':'Salvar template'}</button> <button type="button" className="back-link" onClick={()=>setTemplateForm(false)}>Cancelar</button></div></form>}</section>
    <section className="panel"><div className="head"><div><h2>Histórico</h2><p>Últimas mensagens registradas.</p></div><input style={{maxWidth:260}} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar número ou texto..."/></div>{loading?<div className="empty-box">Carregando...</div>:filtered.length===0?<div className="empty-box"><MessageCircle size={30}/><p>Nenhuma mensagem encontrada.</p></div>:filtered.map(m=><div className="row" key={m.id}><MessageCircle size={17}/><span><b>{m.direction==='outbound'?'Enviada':'Recebida'} · {m.recipient_number||'Número não informado'}</b><small>{m.body||'Sem conteúdo'} · {new Date(m.created_at).toLocaleString('pt-BR')}</small></span><i>{m.status||'registrada'}</i></div>)}</section>
    {error&&<div className="form-error">{error}</div>}{success&&<div className="form-success">{success}</div>}
  </TenantPage>
}
function AutomationsPage(){
  const{activeCompany}=useTenant();
  const[items,setItems]=useState<any[]>([]);const[templates,setTemplates]=useState<any[]>([]);const[dispatches,setDispatches]=useState<any[]>([]);
  const[open,setOpen]=useState(false);const[editing,setEditing]=useState<any>(null);const[deleting,setDeleting]=useState<any>(null);
  const[name,setName]=useState('');const[type,setType]=useState('appointment_reminder');const[advance,setAdvance]=useState('1440');const[channel,setChannel]=useState('whatsapp');const[templateId,setTemplateId]=useState('');const[enabled,setEnabled]=useState(true);
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[error,setError]=useState('');const[success,setSuccess]=useState('');
  async function load(){if(!supabase||!activeCompany)return;setLoading(true);setError('');const[a,t,d]=await Promise.all([
    supabase.from('automations').select('*').eq('company_id',activeCompany.id).order('name'),
    supabase.from('message_templates').select('id,name,active').eq('company_id',activeCompany.id).order('name'),
    supabase.from('automation_dispatches').select('id,automation_id,appointment_id,recipient_number,status,scheduled_for,sent_at,error_message,created_at').eq('company_id',activeCompany.id).order('created_at',{ascending:false}).limit(50)
  ]);if(a.error||t.error||d.error)setError(a.error?.message||t.error?.message||d.error?.message||'Não foi possível carregar as automações.');setItems(a.data||[]);setTemplates((t.data||[]).filter(x=>x.active));setDispatches(d.data||[]);setLoading(false)}
  useEffect(()=>{load()},[activeCompany?.id]);
  function resetForm(){setEditing(null);setName('');setType('appointment_reminder');setAdvance('1440');setChannel('whatsapp');setTemplateId(templates[0]?.id||'');setEnabled(true);setError('');setSuccess('');setOpen(true)}
  function edit(a:any){setEditing(a);setName(a.name||'');setType(a.type||'appointment_reminder');setAdvance(String(a.advance_minutes??1440));setChannel(a.channel||'whatsapp');const m=templates.find(t=>t.name===a.message_template);setTemplateId(m?.id||'');setEnabled(Boolean(a.enabled));setError('');setSuccess('');setOpen(true)}
  async function save(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;const selected=templates.find(t=>t.id===templateId);if(!name.trim()){setError('Informe um nome para a automação.');return}if(channel==='whatsapp'&&!selected){setError('Selecione um template ativo para o WhatsApp.');return}setSaving(true);setError('');const payload={company_id:activeCompany.id,name:name.trim(),type,advance_minutes:Math.max(0,Number(advance)||0),channel,message_template:selected?.name||'',enabled};const result=editing?await supabase.from('automations').update(payload).eq('id',editing.id).eq('company_id',activeCompany.id):await supabase.from('automations').insert(payload);if(result.error)setError(result.error.message);else{setSuccess(editing?'Automação atualizada.':'Automação criada.');setOpen(false);await load()}setSaving(false)}
  async function remove(){if(!supabase||!activeCompany||!deleting)return;const{error}=await supabase.from('automations').delete().eq('id',deleting.id).eq('company_id',activeCompany.id);if(error)setError(error.message);else{setDeleting(null);setSuccess('Automação excluída.');await load()}}
  async function toggle(a:any){if(!supabase||!activeCompany)return;const{error}=await supabase.from('automations').update({enabled:!a.enabled}).eq('id',a.id).eq('company_id',activeCompany.id);if(error)setError(error.message);else await load()}
  const pending=dispatches.filter(d=>d.status==='pending'||d.status==='scheduled').length;const sent=dispatches.filter(d=>d.status==='sent'||d.status==='completed').length;const failed=dispatches.filter(d=>d.status==='failed'||d.status==='error').length;
  return <TenantPage title="Automações" description="Regras de lembretes e mensagens automáticas." action={<button className="hero-btn" onClick={resetForm}><Plus size={16}/> Nova automação</button>}>
    <div className="metrics"><Metric label="Ativas" value={items.filter(a=>a.enabled).length} icon={Bot}/><Metric label="Pendentes" value={pending} icon={Activity}/><Metric label="Enviadas" value={sent} icon={CheckCircle2}/><Metric label="Falhas" value={failed} icon={CircleAlert}/></div>
    <section className="panel">{error&&<div className="form-error">{error}</div>}{success&&<div className="form-success">{success}</div>}{loading?<div className="empty-box">Carregando automações...</div>:items.length===0?<div className="empty-box"><Bot size={35}/><h2>Nenhuma automação</h2><p>Crie uma regra para lembretes de consulta.</p><button className="hero-btn" onClick={resetForm}><Plus size={16}/> Criar automação</button></div>:items.map(a=><div className="row" key={a.id}><Bot size={18}/><span><b>{a.name}</b><small>{a.advance_minutes>=1440?Math.round(a.advance_minutes/1440)+' dia(s)':a.advance_minutes>=60?Math.round(a.advance_minutes/60)+' hora(s)':a.advance_minutes+' min'} antes · {a.channel} · {a.message_template||'Sem template'}</small></span><i>{a.enabled?'Ativa':'Inativa'}</i><button className="back-link" onClick={()=>edit(a)}>Editar</button><button className="back-link" onClick={()=>toggle(a)}>{a.enabled?'Desativar':'Ativar'}</button><button className="back-link" onClick={()=>setDeleting(a)}>Excluir</button></div>)}</section>
    <section className="panel"><div className="head"><div><h2>Histórico de disparos</h2><p>Últimos eventos registrados pelas automações.</p></div></div>{dispatches.length===0?<div className="empty-box"><Activity size={30}/><p>Nenhum disparo registrado ainda.</p></div>:dispatches.map(d=><div className="row" key={d.id}><Activity size={17}/><span><b>{d.recipient_number||'Número não informado'}</b><small>Agendado: {d.scheduled_for?new Date(d.scheduled_for).toLocaleString('pt-BR'):'—'}{d.sent_at?' · Enviado: '+new Date(d.sent_at).toLocaleString('pt-BR'):''}{d.error_message?' · '+d.error_message:''}</small></span><i>{d.status}</i></div>)}</section>
    {deleting&&<div className="modal-backdrop"><div className="modal panel"><h2>Excluir automação?</h2><p>O registro da regra será removido. O histórico de disparos não será apagado.</p><button className="hero-btn" onClick={remove}>Excluir</button> <button className="back-link" onClick={()=>setDeleting(null)}>Cancelar</button></div></div>}
    {open&&<div className="modal-backdrop"><form className="modal panel" onSubmit={save}><div className="head"><div><h2>{editing?'Editar automação':'Nova automação'}</h2><p>Defina quando e qual mensagem será usada.</p></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)}><XCircle size={18}/></button></div><div className="form-grid"><label>Nome*<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Lembrete de consulta"/></label><label>Gatilho<select value={type} onChange={e=>setType(e.target.value)}><option value="appointment_reminder">Lembrete de consulta</option><option value="appointment_confirmation">Confirmação de consulta</option><option value="appointment_followup">Pós-consulta</option></select></label><label>Antecedência<select value={advance} onChange={e=>setAdvance(e.target.value)}><option value="60">1 hora antes</option><option value="120">2 horas antes</option><option value="1440">1 dia antes</option><option value="2880">2 dias antes</option><option value="10080">7 dias antes</option></select></label><label>Canal<select value={channel} onChange={e=>setChannel(e.target.value)}><option value="whatsapp">WhatsApp</option><option value="manual">Manual</option></select></label><label>Mensagem padrão<select value={templateId} onChange={e=>setTemplateId(e.target.value)} disabled={channel!=='whatsapp'}><option value="">Selecione um template</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Status<select value={enabled?'active':'inactive'} onChange={e=>setEnabled(e.target.value==='active')}><option value="active">Ativa</option><option value="inactive">Inativa</option></select></label></div>{channel==='whatsapp'&&templates.length===0&&<div className="form-error">Nenhum template ativo. Crie uma mensagem padrão em WhatsApp antes de ativar esta automação.</div>}<div><button className="hero-btn" disabled={saving}>{saving?'Salvando...':editing?'Salvar alterações':'Criar automação'} <CheckCircle2 size={16}/></button> <button type="button" className="back-link" onClick={()=>setOpen(false)}>Cancelar</button></div></form></div>}
  </TenantPage>
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
  const[zip,setZip]=useState('');const[street,setStreet]=useState('');const[number,setNumber]=useState('');const[complement,setComplement]=useState('');const[neighborhood,setNeighborhood]=useState('');const[city,setCity]=useState('');const[state,setState]=useState('');
  const[fullName,setFullName]=useState('');const[loginEmail,setLoginEmail]=useState('');const[newPassword,setNewPassword]=useState('');const[showPassword,setShowPassword]=useState(false);
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[error,setError]=useState('');const[success,setSuccess]=useState('');
  useEffect(()=>{async function load(){if(!supabase||!activeCompany)return;setLoading(true);const[{data:c},{data:{user}}]=await Promise.all([supabase.from('companies').select('*').eq('id',activeCompany.id).maybeSingle(),supabase.auth.getUser()]);setName(c?.name||'');setLegal(c?.legal_name||'');setCnpj(c?.cnpj||'');setPhone(c?.phone||'');setEmail(c?.email||'');setZip(c?.zip_code||'');setStreet(c?.street||'');setNumber(c?.number||'');setComplement(c?.complement||'');setNeighborhood(c?.neighborhood||'');setCity(c?.city||'');setState(c?.state||'');setLoginEmail(user?.email||'');if(user){const{data:p}=await supabase.from('profiles').select('full_name').eq('id',user.id).maybeSingle();setFullName(p?.full_name||'')}setLoading(false)}load()},[activeCompany?.id]);
  async function saveCompany(e:React.FormEvent){e.preventDefault();if(!supabase||!activeCompany)return;setSaving(true);setError('');setSuccess('');const{error}=await supabase.from('companies').update({name:name.trim(),legal_name:legal||null,cnpj:cnpj||null,phone:phone||null,email:email||null,zip_code:zip||null,street:street||null,number:number||null,complement:complement||null,neighborhood:neighborhood||null,city:city||null,state:state||null}).eq('id',activeCompany.id);if(error)setError(error.message);else setSuccess('Dados do consultório salvos.');setSaving(false)}
  async function saveProfile(e:React.FormEvent){e.preventDefault();if(!supabase)return;setSaving(true);setError('');setSuccess('');const{data:{user}}=await supabase.auth.getUser();if(!user){setError('Sessão expirada.');setSaving(false);return}const p=await supabase.from('profiles').upsert({id:user.id,full_name:fullName.trim()},{onConflict:'id'});if(p.error){setError(p.error.message);setSaving(false);return}if(newPassword){const u=await supabase.auth.updateUser({password:newPassword});if(u.error){setError(u.error.message);setSaving(false);return}}setNewPassword('');setSuccess('Perfil e segurança atualizados.');setSaving(false)}
  if(loading)return <TenantPage title="Configurações" description="Dados do consultório e da conta."><div className="panel">Carregando...</div></TenantPage>;
  return <TenantPage title="Configurações" description="Dados do consultório e da conta.">
    <section className="panel"><div className="head"><div><h2>Consultório</h2><p>Dados exibidos e usados na operação.</p></div></div><form className="form-grid" onSubmit={saveCompany}><label>Nome fantasia*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Razão social<input value={legal} onChange={e=>setLegal(e.target.value)}/></label><label>CNPJ<input value={cnpj} onChange={e=>setCnpj(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>CEP<input value={zip} onChange={e=>setZip(e.target.value)}/></label><label>Rua<input value={street} onChange={e=>setStreet(e.target.value)}/></label><label>Número<input value={number} onChange={e=>setNumber(e.target.value)}/></label><label>Complemento<input value={complement} onChange={e=>setComplement(e.target.value)}/></label><label>Bairro<input value={neighborhood} onChange={e=>setNeighborhood(e.target.value)}/></label><label>Cidade<input value={city} onChange={e=>setCity(e.target.value)}/></label><label>Estado<input maxLength={2} value={state} onChange={e=>setState(e.target.value.toUpperCase())}/></label><div><button className="hero-btn" disabled={saving}>{saving?'Salvando...':'Salvar dados'} <CheckCircle2 size={16}/></button></div></form></section>
    <section className="panel"><div className="head"><div><h2>Minha conta</h2><p>Atualize seu nome e senha de acesso.</p></div></div><form className="form-grid" onSubmit={saveProfile}><label>Nome completo<input value={fullName} onChange={e=>setFullName(e.target.value)}/></label><label>E-mail de login<input disabled value={loginEmail}/></label><label>Nova senha<div className="password-wrap"><input type={showPassword?'text':'password'} minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Deixe vazio para manter"/><button type="button" className="icon-btn" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label><div><button className="hero-btn" disabled={saving}>{saving?'Salvando...':'Salvar conta'} <CheckCircle2 size={16}/></button></div></form></section>
    {error&&<div className="form-error">{error}</div>}{success&&<div className="form-success">{success}</div>}
  </TenantPage>
}
function TenantDashboard(){const{activeCompany}=useTenant();const navigate=useNavigate();const[stats,setStats]=useState({today:0,confirmed:0,pending:0,done:0,patients:0,professionals:0});const[next,setNext]=useState<any[]>([]);const[wa,setWa]=useState<any>(null);useEffect(()=>{async function load(){if(!supabase||!activeCompany)return;const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);const [ap,pa,pr,wi]=await Promise.all([supabase.from('appointments').select('id,starts_at,status,patients(full_name),professionals(name)').eq('company_id',activeCompany.id).gte('starts_at',start.toISOString()).lt('starts_at',end.toISOString()).order('starts_at'),supabase.from('patients').select('*',{count:'exact',head:true}).eq('company_id',activeCompany.id),supabase.from('professionals').select('*',{count:'exact',head:true}).eq('company_id',activeCompany.id),supabase.from('whatsapp_integrations').select('status,phone_number').eq('company_id',activeCompany.id).maybeSingle()]);const list=ap.data||[];setNext(list.slice(0,5));setStats({today:list.length,confirmed:list.filter(x=>x.status==='confirmed').length,pending:list.filter(x=>x.status==='scheduled'||x.status==='pending').length,done:list.filter(x=>x.status==='completed'||x.status==='done').length,patients:pa.count||0,professionals:pr.count||0});setWa(wi.data||null)}load()},[activeCompany?.id]);return <div className="content"><div className="head"><div><h1>Dashboard</h1><p>{activeCompany?.name}</p></div><button className="hero-btn" onClick={()=>navigate('/agenda')}><Plus size={16}/> Novo atendimento</button></div><div className="metrics"><Metric label="Consultas hoje" value={stats.today} icon={CalendarDays}/><Metric label="Confirmadas" value={stats.confirmed} icon={CheckCircle2}/><Metric label="Pendentes" value={stats.pending} icon={Activity}/><Metric label="Realizadas" value={stats.done} icon={CheckCircle2}/></div><div className="grid"><section className="panel"><div className="head"><div><h2>Próximos atendimentos</h2><p>Agenda de hoje</p></div><button className="back-link" onClick={()=>navigate('/agenda')}>Ver agenda</button></div>{next.length===0?<Empty text="Nenhum atendimento para hoje."/>:next.map(a=><div className="row" key={a.id}><CalendarDays size={17}/><span><b>{new Date(a.starts_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · {a.patients?.full_name||'Paciente'}</b><small>{a.professionals?.name||'Profissional'} · {a.status}</small></span></div>)}</section><section className="panel"><h2>Resumo do consultório</h2><div className="stats"><div><b>{stats.patients}</b><small>pacientes</small></div><div><b>{stats.professionals}</b><small>profissionais</small></div></div><div className="wa" style={{marginTop:12}}><MessageCircle size={20}/><span><b>{wa?.status||'WhatsApp não conectado'}</b><small>{wa?.phone_number||'Configure o número da empresa.'}</small></span></div></section></div></div>}

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
        <Route path="configuracoes" element={<TenantSettingsPage/>}/>
        </Route>
      </Route>
    </Route>

    <Route path="/app" element={<Navigate to="/dashboard" replace/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}

