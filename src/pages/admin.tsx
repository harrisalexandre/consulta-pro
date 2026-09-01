import React, { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, useNavigate, useParams } from 'react-router-dom'
import { Activity, ArrowLeft, BarChart3, Bot, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, Eye, EyeOff, LayoutDashboard, LogIn, LogOut, MessageCircle, Plus, Search, Settings, ShieldCheck, UserRound, Users, Wifi, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'
import { Empty, Metric, AdminPlaceholder, getSupabase } from './shared'

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
  const navigate=useNavigate();const{refresh}=useTenant();const[name,setName]=useState('');const[timezone,setTimezone]=useState('America/Sao_Paulo');const[legal,setLegal]=useState('');const[cnpj,setCnpj]=useState('');const[phone,setPhone]=useState('');const[email,setEmail]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('')
  async function submit(e:React.FormEvent){e.preventDefault();if(!supabase||!name.trim())return;setBusy(true);setError('');const{error}=await supabase!.rpc('superadmin_create_company',{company_name:name.trim(),timezone,legal_name:legal||null,cnpj:cnpj||null,phone:phone||null,email:email||null});if(error)setError(error.message);else{await refresh();navigate('/admin/empresas')}setBusy(false)}
  return <div className="content"><div className="head"><div><button className="back-link" onClick={()=>navigate('/admin/empresas')}><ArrowLeft size={15}/> Empresas</button><h1>Nova empresa</h1><p>Cadastre um novo tenant do Consulta Pro.</p></div></div><section className="panel"><form className="form-grid" onSubmit={submit}><label>Nome fantasia*<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Fuso horário*<select required value={timezone} onChange={e=>setTimezone(e.target.value)}><option value="America/Sao_Paulo">Brasil — Brasília (UTC−3)</option><option value="America/Manaus">Brasil — Manaus (UTC−4)</option><option value="America/Rio_Branco">Brasil — Rio Branco (UTC−5)</option><option value="America/Noronha">Brasil — Fernando de Noronha (UTC−2)</option></select><small>Usado para agenda e automações.</small></label><label>Razão social<input value={legal} onChange={e=>setLegal(e.target.value)}/></label><label>CNPJ<input value={cnpj} onChange={e=>setCnpj(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>{error&&<div className="form-error">{error}</div>}<div><button className="hero-btn" disabled={busy}>{busy?'Criando...':'Criar empresa'} <CheckCircle2 size={16}/></button></div></form></section></div>
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
    const{data,error}=await supabase!.functions.invoke('superadmin-create-company-user',{
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
  async function saveEdit(e:React.FormEvent){e.preventDefault();if(!supabase||!id||!editing)return;setEditBusy(true);setUserError('');setUserSuccess('');const body:any={user_id:editing.user_id,company_id:id,full_name:editName,role:editRole,status:editStatus};if(resetPassword)body.password=resetPassword;const{data,error}=await supabase!.functions.invoke('superadmin-update-company-user',{body});if(error)setUserError(error.message||'Não foi possível atualizar o usuário.');else if(data?.error)setUserError(data.error);else{setUserSuccess('Usuário atualizado com sucesso.');setEditing(null);await loadUsers()}setEditBusy(false)}

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
    const{data,error}=await supabase!.from('company_users').select('user_id,company_id,role,status,created_at,profiles(full_name),companies(name)').order('created_at',{ascending:false});
    if(error)setError(error.message); setUsers(data||[]); setLoading(false);
  }
  useEffect(()=>{load()},[]);
  return <div className="content"><div className="head"><div><h1>Usuários</h1><p>Acessos vinculados aos consultórios da plataforma.</p></div></div><section className="panel">{loading?<div className="empty-box">Carregando usuários...</div>:error?<div className="form-error">{error}</div>:users.length===0?<div className="empty-box"><Users size={35}/><h2>Nenhum usuário</h2><p>Os acessos criados para as empresas aparecerão aqui.</p></div>:users.map(u=><div className="row" key={u.user_id}><UserRound size={18}/><span><b>{u.profiles?.full_name||'Usuário'}</b><small>{u.companies?.name||'Empresa'} · {u.role==='owner'?'Owner':u.role==='admin'?'Admin':u.role}</small></span><i>{u.status}</i><NavLink to={'/admin/empresas/'+u.company_id}>Gerenciar empresa</NavLink></div>)}</section></div>
}
function AdminMessages(){const[period,setPeriod]=useState('30');const[count,setCount]=useState(0);useEffect(()=>{async function load(){if(!supabase)return;const since=new Date(Date.now()-Number(period)*86400000).toISOString();const{count}=await supabase!.from('whatsapp_messages').select('*',{count:'exact',head:true}).gte('created_at',since);setCount(count||0)}load()},[period]);return <div className="content"><div className="head"><div><h1>Mensagens</h1><p>Mensageria global da plataforma.</p></div><select className="company-select" value={period} onChange={e=>setPeriod(e.target.value)}><option value="1">Hoje</option><option value="7">7 dias</option><option value="30">30 dias</option></select></div><div className="metrics"><Metric label="Mensagens no período" value={count} icon={MessageCircle}/><Metric label="Status" value="Monitorando" icon={Activity}/></div><section className="panel"><h2>Visão de operação</h2><p>Os eventos reais do WhatsApp serão consolidados aqui conforme as integrações forem utilizadas.</p></section></div>}
export { AdminDashboard, AdminCompanies, NewCompany, CompanyDetail, Permissions, AdminUsers, AdminMessages }
