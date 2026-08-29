import React, { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, Building2, CalendarDays, CheckCircle2, LogIn, LogOut, MessageCircle, Plus, Settings, ShieldCheck, UserRound, Users } from 'lucide-react'
import { supabase } from './lib/supabase'
import { useTenant } from './contexts/TenantContext'

const nav = [
  ['/dashboard', 'Dashboard'],
  ['/agenda', 'Agenda'],
  ['/pacientes', 'Pacientes'],
  ['/profissionais', 'Profissionais'],
  ['/whatsapp', 'WhatsApp'],
  ['/automacoes', 'Automações'],
  ['/configuracoes', 'Configurações'],
] as const

function Landing() {
  const navigate = useNavigate()
  return (
    <div className="landing">
      <header className="landing-nav"><div className="logo"><b>C</b> Consulta Pro</div><button className="login-link" onClick={() => navigate('/login')}><LogIn size={16} /> Entrar</button></header>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">GESTÃO INTELIGENTE DE ATENDIMENTOS</span><h1>Sua agenda organizada.<br /><em>Seu consultório conectado.</em></h1><p>Centralize pacientes, profissionais, agenda e lembretes de WhatsApp em um único lugar.</p><button className="hero-btn" onClick={() => navigate('/login')}>Acessar meu consultório <ArrowRight size={17} /></button><div className="trust"><ShieldCheck size={16} /><span>Dados isolados por empresa com Supabase RLS</span></div></div>
        <div className="hero-card"><div className="mini-top"><span>Hoje</span><CheckCircle2 size={17} /></div><div className="mini-title">Próximos atendimentos</div><div className="mini-row"><strong>10:45</strong><span><b>Paciente</b><small>Atendimento</small></span><i>Confirmado</i></div><div className="mini-row"><strong>11:30</strong><span><b>Paciente</b><small>Atendimento</small></span><i>Confirmado</i></div><div className="mini-wa"><MessageCircle size={18} /><span><b>Lembretes pelo WhatsApp</b><small>Integração por empresa</small></span></div></div>
      </section>
    </div>
  )
}

function Login() {
  const navigate = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    if (!supabase) { setError('Supabase não configurado.'); setLoading(false); return }
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('E-mail ou senha inválidos.'); setLoading(false); return }
    navigate('/dashboard')
  }
  return <div className="auth"><div className="auth-card"><div className="logo center"><b>C</b> Consulta Pro</div><h1>Bem-vindo de volta</h1><p>Entre para acessar o sistema.</p><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <div className="form-error">{error}</div>}<button className="hero-btn full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button></form><button className="back" onClick={() => navigate('/')}>Voltar para o início</button></div></div>
}

function Superadmin() {
  const { companies, refresh } = useTenant(); const [name, setName] = useState(''); const [legal, setLegal] = useState(''); const [cnpj, setCnpj] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function createCompany() {
    if (!supabase || !name.trim()) return
    setBusy(true); setError('')
    const { error: rpcError } = await supabase.rpc('superadmin_create_company', { company_name: name.trim(), legal_name: legal || null, cnpj: cnpj || null, phone: null, email: null })
    if (rpcError) setError(rpcError.message); else { setName(''); setLegal(''); setCnpj(''); await refresh() }
    setBusy(false)
  }
  return <div className="content"><div className="head"><div><h1>Empresas</h1><p>Administração global do Consulta Pro.</p></div></div><div className="grid"><section className="panel"><h2>Novo consultório</h2><div className="form-grid"><input placeholder="Nome da empresa*" value={name} onChange={e => setName(e.target.value)} /><input placeholder="Razão social" value={legal} onChange={e => setLegal(e.target.value)} /><input placeholder="CNPJ" value={cnpj} onChange={e => setCnpj(e.target.value)} /></div>{error && <div className="form-error">{error}</div>}<button className="hero-btn" disabled={busy || !name.trim()} onClick={createCompany}>{busy ? 'Criando...' : 'Criar consultório'} <Plus size={16} /></button></section><section className="panel"><h2>Mensageria global</h2><div className="metrics"><div className="card"><span>Hoje</span><b>0</b></div><div className="card"><span>Semana</span><b>0</b></div><div className="card"><span>Mês</span><b>0</b></div></div><p>As métricas serão alimentadas pelas mensagens reais.</p></section></div><section className="panel"><h2>Consultórios</h2>{companies.length === 0 ? <p>Nenhum consultório cadastrado.</p> : companies.map(company => <div className="mini-row" key={company.id}><strong>{company.name}</strong><span>{company.cnpj || 'CNPJ não informado'}</span><i>Ativo</i></div>)}</section></div>
}

function CompanyGate() { const { activeCompany } = useTenant(); if (activeCompany) return null; return <div className="content"><section className="panel"><Building2 size={36} /><h2>Empresa não configurada</h2><p>Entre em contato com o administrador.</p></section></div> }
function EmptyPage({ title, description, icon: Icon, action = 'Novo' }: { title: string; description: string; icon: React.ElementType; action?: string }) { return <div className="content"><div className="head"><div><h1>{title}</h1><p>{description}</p></div><button className="hero-btn"><Plus size={16} />{action}</button></div><section className="panel placeholder"><Icon size={42} /><h2>{title}</h2><p>Nenhum registro encontrado. Esta tela está ligada ao tenant ativo e pronta para o CRUD.</p></section></div> }
function Dashboard() { const { activeCompany } = useTenant(); return <div className="content"><div className="head"><div><h1>Dashboard</h1><p>{activeCompany?.name}</p></div><button className="hero-btn"><Plus size={16} /> Novo atendimento</button></div><div className="metrics">{[['Consultas hoje','0'],['Confirmadas','0'],['Pendentes','0'],['Realizadas','0']].map(item=><div className="card" key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</div><div className="grid"><section className="panel"><h2>Próximos atendimentos</h2><p>Os atendimentos reais aparecerão aqui quando cadastrados.</p></section><section className="panel"><h2>WhatsApp</h2><p>Nenhuma integração conectada.</p></section></div></div> }
function AuthGate() { const [session, setSession] = useState<boolean | null>(null); useEffect(() => { if (!supabase) { setSession(false); return }; supabase.auth.getSession().then(({ data }) => setSession(!!data.session)); const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(!!currentSession)); return () => data.subscription.unsubscribe() }, []); if (session === null) return <div className="content"><div className="panel">Carregando sessão...</div></div>; if (!session) return <Navigate to="/login" replace />; return <Layout /> }
function Layout() { const { activeCompany, companies, setActiveCompany } = useTenant(); const navigate = useNavigate(); async function logout() { await supabase?.auth.signOut(); navigate('/login') } if (!activeCompany) return <CompanyGate />; return <div className="layout"><aside><div className="logo"><b>C</b> Consulta Pro</div><div className="company">{activeCompany.name}</div>{companies.length > 1 && <select className="company-select" value={activeCompany.id} onChange={e => { const company = companies.find(item => item.id === e.target.value); if (company) setActiveCompany(company) }}>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select>}<nav>{nav.map(([path, label]) => <NavLink key={path} to={path}>{label}</NavLink>)}</nav><div className="profile"><b>A</b><span>Conta ativa<small>Tenant protegido por RLS</small></span><button onClick={logout} title="Sair"><LogOut size={15} /></button></div></aside><main><header><strong>{activeCompany.name}</strong><span>Administrador</span></header><Routes><Route index element={<Dashboard />} /><Route path="dashboard" element={<Dashboard />} /><Route path="agenda" element={<EmptyPage title="Agenda" description="Organize seus atendimentos." icon={CalendarDays} />} /><Route path="pacientes" element={<EmptyPage title="Pacientes" description="Gerencie os pacientes da empresa." icon={Users} />} /><Route path="profissionais" element={<EmptyPage title="Profissionais" description="Gerencie os profissionais da empresa." icon={UserRound} />} /><Route path="whatsapp" element={<EmptyPage title="WhatsApp" description="Gerencie a integração da empresa." icon={MessageCircle} />} /><Route path="automacoes" element={<EmptyPage title="Automações" description="Configure lembretes e mensagens." icon={Bot} />} /><Route path="configuracoes" element={<EmptyPage title="Configurações" description="Configure empresa, usuários e preferências." icon={Settings} />} /></Routes></main></div> }

export default function App() { return <Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/admin/empresas" element={<AuthGate />} /><Route path="*" element={<AuthGate />} /></Routes> }
