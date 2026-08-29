import { useEffect, useRef } from 'react'

const landingCss = `
  :root{
    --green-deep:#1F4D3C;
    --green-mid:#2D6A4F;
    --green-soft:#E4EDE7;
    --cream:#FBF8F3;
    --white:#FFFFFF;
    --stone-600:#6B655C;
    --stone-800:#3A362F;
    --border:#ECE7DC;
    --shadow-soft: 0 1px 1px rgba(31,77,60,0.03), 0 16px 40px -20px rgba(31,77,60,0.14);
    --radius-sm: 10px;
    --radius-md: 18px;
    --radius-lg: 28px;
    --font-display:'Manrope', sans-serif;
    --font-body:'Inter', sans-serif;
    --font-mono:'IBM Plex Mono', monospace;
  }

  *{margin:0;padding:0;box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    font-family:var(--font-body);
    color:var(--stone-800);
    background:var(--cream);
    line-height:1.5;
    -webkit-font-smoothing:antialiased;
  }
  img,svg{display:block;max-width:100%;}
  a{color:inherit;text-decoration:none;}
  ul{list-style:none;}
  button{font-family:inherit;cursor:pointer;border:none;background:none;}

  @media (prefers-reduced-motion: reduce){
    *{animation-duration:0.01ms !important; animation-iteration-count:1 !important; transition-duration:0.01ms !important; scroll-behavior:auto !important;}
  }

  .container{
    width:100%;
    max-width:1180px;
    margin:0 auto;
    padding:0 24px;
  }

  h1,h2,h3{font-family:var(--font-display);font-weight:700;color:var(--green-deep);letter-spacing:-0.03em;}

  .eyebrow{
    font-family:var(--font-mono);
    font-size:12px;
    letter-spacing:0.08em;
    text-transform:uppercase;
    color:var(--green-mid);
    display:inline-flex;
    align-items:center;
    gap:8px;
    margin-bottom:14px;
  }
  .eyebrow::before{
    content:"";
    width:16px;height:1px;background:var(--green-mid);
  }

  .btn{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    padding:14px 26px;
    border-radius:999px;
    font-weight:600;
    font-size:15px;
    transition:transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease, background .25s ease;
  }
  .btn-primary{
    background:var(--green-deep);
    color:var(--white);
    box-shadow:0 6px 16px -6px rgba(31,77,60,0.45);
  }
  .btn-primary:hover{transform:translateY(-2px); box-shadow:0 10px 22px -6px rgba(31,77,60,0.5);}
  .btn-ghost{
    background:transparent;
    color:var(--green-deep);
    border:1px solid var(--border);
  }
  .btn-ghost:hover{background:var(--white); border-color:var(--green-mid);}
  .btn-block{width:100%;}

  /* ===== Header ===== */
  header{
    position:sticky;top:0;z-index:100;
    background:rgba(251,248,243,0.85);
    backdrop-filter:blur(10px);
    border-bottom:1px solid var(--border);
  }
  .nav{
    display:flex;align-items:center;justify-content:space-between;
    height:72px;
  }
  .logo{
    font-family:var(--font-display);
    font-size:20px;font-weight:700;color:var(--green-deep);
    display:flex;align-items:center;gap:8px;
  }
  .logo-mark{
    width:26px;height:26px;border-radius:7px;
    background:var(--green-deep);
    position:relative;flex-shrink:0;
  }
  .logo-mark::after{
    content:"";position:absolute;inset:7px 7px 11px 7px;
    border-radius:2px;background:var(--cream);
  }
  .logo-mark::before{
    content:"";position:absolute;left:7px;right:7px;top:11px;height:2px;background:var(--green-deep);
    box-shadow:0 4px 0 var(--green-deep);
  }
  .nav-links{display:flex;align-items:center;gap:36px;}
  .nav-links a{font-size:14.5px;font-weight:500;color:var(--stone-800);transition:color .15s;}
  .nav-links a:hover{color:var(--green-mid);}
  .nav-actions{display:flex;align-items:center;gap:12px;}
  .nav-actions .btn{padding:11px 20px;font-size:14px;}
  .menu-toggle{
    display:none;width:40px;height:40px;align-items:center;justify-content:center;
    flex-direction:column;gap:5px;
  }
  .menu-toggle span{width:20px;height:2px;background:var(--stone-800);border-radius:2px;transition:transform .2s, opacity .2s;}
  .mobile-panel{
    display:none;flex-direction:column;gap:2px;
    background:var(--white);border-bottom:1px solid var(--border);
    padding:8px 24px 20px;
  }
  .mobile-panel.open{display:flex;}
  .mobile-panel a{padding:12px 0;font-size:15px;font-weight:500;border-bottom:1px solid var(--border);}
  .mobile-panel .btn{margin-top:14px;}

  @media (max-width:900px){
    .nav-links{display:none;}
    .nav-actions .btn-ghost{display:none;}
    .menu-toggle{display:flex;}
  }

  section{padding:96px 0;}
  @media (max-width:720px){section{padding:64px 0;}}

  .reveal{opacity:0;transform:translateY(18px);transition:opacity .7s ease, transform .7s ease;}
  .reveal.in{opacity:1;transform:translateY(0);}

  /* ===== Hero ===== */
  /* Scoped reset: the app's authenticated layout also uses .hero. */
  .public-landing .hero{
    max-width:none;
    margin:0;
    display:block;
    grid-template-columns:none;
    padding:76px 0 90px;
    position:relative;
    overflow:hidden;
  }
  .hero::before{
    content:"";position:absolute;top:-160px;right:-160px;width:480px;height:480px;
    background:radial-gradient(circle, rgba(45,106,79,0.12), transparent 70%);
    pointer-events:none;
  }
  .hero-grid{
    display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center;
  }
  @media (max-width:980px){
    .hero-grid{grid-template-columns:1fr;text-align:center;}
    .hero-actions{justify-content:center;}
    .hero-trust{justify-content:center;}
  }
  .hero h1{font-size:clamp(36px,5.6vw,58px);line-height:1.05;margin-bottom:22px;font-weight:800;}
  .hero-sub{font-size:18px;font-weight:400;color:var(--stone-600);max-width:480px;margin-bottom:34px;}
  @media (max-width:980px){.hero-sub{margin-left:auto;margin-right:auto;}}
  .hero-actions{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:30px;}
  .hero-trust{display:flex;gap:18px;flex-wrap:wrap;color:var(--stone-600);font-size:13.5px;}
  .hero-trust span{display:flex;align-items:center;gap:6px;}
  .dot{width:6px;height:6px;border-radius:50%;background:var(--green-mid);flex-shrink:0;}

  /* App mockup — signature element */
  .app-card{
    background:var(--white);
    border:1px solid var(--border);
    border-radius:var(--radius-lg);
    box-shadow:var(--shadow-soft);
    padding:22px;
    position:relative;
  }
  .app-card-head{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border);
  }
  .app-card-head .title{font-family:var(--font-display);font-size:17px;color:var(--green-deep);}
  .app-card-head .today-badge{
    font-family:var(--font-mono);font-size:11px;color:var(--green-mid);
    background:var(--green-soft);padding:4px 10px;border-radius:999px;
  }
  .agenda-row{
    display:flex;align-items:center;gap:14px;padding:11px 0;
    border-bottom:1px solid var(--border);
  }
  .agenda-row:last-of-type{border-bottom:none;}
  .agenda-time{
    font-family:var(--font-mono);font-size:13px;color:var(--stone-600);width:46px;flex-shrink:0;
  }
  .agenda-bar{width:3px;height:32px;border-radius:2px;background:var(--green-mid);flex-shrink:0;}
  .agenda-info{flex:1;min-width:0;}
  .agenda-info .patient{font-size:14.5px;font-weight:600;color:var(--stone-800);}
  .agenda-info .pro{font-size:12.5px;color:var(--stone-600);}
  .wa-mini{
    margin-top:16px;display:flex;align-items:center;gap:12px;
    background:var(--green-soft);border-radius:var(--radius-md);padding:13px 16px;
  }
  .wa-dot{width:9px;height:9px;border-radius:50%;background:#2D6A4F;box-shadow:0 0 0 3px rgba(45,106,79,0.18);flex-shrink:0;}
  .wa-mini .t1{font-size:13.5px;font-weight:600;color:var(--green-deep);}
  .wa-mini .t2{font-size:12px;color:var(--stone-600);}

  /* ===== Trust bar ===== */
  .trust-bar{padding:36px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--white);}
  .trust-bar p{text-align:center;font-family:var(--font-display);font-size:19px;color:var(--green-deep);margin-bottom:26px;}
  .trust-items{display:flex;justify-content:center;gap:40px;flex-wrap:wrap;}
  .trust-items span{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--stone-600);font-weight:500;}

  /* ===== Section headers ===== */
  .section-head{max-width:620px;margin-bottom:52px;}
  .section-head.center{margin-left:auto;margin-right:auto;text-align:center;}
  .section-head h2{font-size:clamp(26px,3.4vw,38px);line-height:1.15;}
  .section-head p{font-size:16.5px;color:var(--stone-600);margin-top:14px;}

  /* ===== Problem ===== */
  .problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;}
  @media (max-width:900px){.problem-grid{grid-template-columns:1fr;}}
  .before-card{
    background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);
    padding:28px;box-shadow:var(--shadow-soft);
  }
  .before-list{display:flex;flex-direction:column;gap:14px;}
  .before-item{
    display:flex;align-items:flex-start;gap:12px;font-size:14.5px;color:var(--stone-600);
    padding:12px 14px;background:var(--cream);border-radius:var(--radius-sm);
    border:1px dashed var(--border);
  }
  .before-item .x{
    width:18px;height:18px;border-radius:50%;background:#EFE6D8;color:#9A6B4F;
    display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:1px;
  }

  /* ===== Features ===== */
  .features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
  @media (max-width:900px){.features-grid{grid-template-columns:repeat(2,1fr);}}
  @media (max-width:600px){.features-grid{grid-template-columns:1fr;}}
  .feature-card{
    background:var(--white);border:1px solid var(--border);border-radius:var(--radius-md);
    padding:26px;box-shadow:var(--shadow-soft);transition:transform .18s ease, border-color .18s ease;
  }
  .feature-card:hover{transform:translateY(-4px);border-color:var(--green-mid);}
  .feature-icon{
    width:40px;height:40px;border-radius:10px;background:var(--green-soft);
    display:flex;align-items:center;justify-content:center;margin-bottom:16px;
    color:var(--green-deep);
  }
  .feature-card h3{font-size:16px;color:var(--stone-800);margin-bottom:8px;font-family:var(--font-body);font-weight:600;}
  .feature-card p{font-size:14px;color:var(--stone-600);}

  /* ===== Split sections (Agenda / WhatsApp / Automation) ===== */
  .split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
  @media (max-width:900px){.split{grid-template-columns:1fr;}}
  .split.reverse .split-visual{order:-1;}
  @media (max-width:900px){.split.reverse .split-visual{order:0;}}
  .split-text h2{font-size:clamp(24px,3vw,32px);margin-bottom:16px;}
  .split-text p{font-size:16px;color:var(--stone-600);margin-bottom:8px;max-width:440px;}

  .week-mockup{
    background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);
    box-shadow:var(--shadow-soft);padding:20px;
  }
  .week-tabs{display:flex;gap:8px;margin-bottom:16px;}
  .week-tabs span{font-size:12px;font-family:var(--font-mono);color:var(--stone-600);padding:5px 11px;border-radius:999px;background:var(--cream);}
  .week-tabs span.active{background:var(--green-deep);color:var(--white);}
  .week-grid{display:grid;grid-template-columns:44px 1fr;gap:0;}
  .hour-col{display:flex;flex-direction:column;}
  .hour-cell{height:48px;font-family:var(--font-mono);font-size:11px;color:var(--stone-600);border-top:1px solid var(--border);padding-top:2px;}
  .slots-col{position:relative;border-top:1px solid var(--border);}
  .slot{
    position:absolute;left:0;right:8px;background:var(--green-soft);border-left:3px solid var(--green-mid);
    border-radius:8px;padding:8px 12px;font-size:12.5px;color:var(--green-deep);font-weight:600;
    display:flex;flex-direction:column;justify-content:center;gap:2px;line-height:1.3;
  }
  .slot small{display:block;font-weight:400;color:var(--stone-600);font-size:11px;font-family:var(--font-body);line-height:1.3;}

  .chat-mockup{
    background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);
    box-shadow:var(--shadow-soft);padding:20px;
  }
  .chat-header{display:flex;align-items:center;gap:10px;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:16px;}
  .chat-avatar{width:34px;height:34px;border-radius:50%;background:var(--green-deep);flex-shrink:0;}
  .chat-header .name{font-size:14px;font-weight:600;}
  .chat-header .status{font-size:11.5px;color:var(--green-mid);}
  .bubble{
    background:var(--green-soft);border-radius:14px 14px 14px 4px;padding:12px 16px;
    font-size:13.5px;color:var(--stone-800);max-width:88%;margin-bottom:10px;line-height:1.5;
  }
  .bubble-meta{display:flex;gap:12px;font-size:11px;color:var(--stone-600);margin-bottom:16px;padding-left:4px;}
  .chat-stats{display:flex;gap:10px;flex-wrap:wrap;}
  .chat-stat{
    flex:1;min-width:100px;background:var(--cream);border-radius:var(--radius-sm);padding:12px;text-align:center;
  }
  .chat-stat .num{font-family:var(--font-display);font-size:20px;color:var(--green-deep);}
  .chat-stat .lbl{font-size:11px;color:var(--stone-600);margin-top:2px;}

  .automation-mockup{
    background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);
    box-shadow:var(--shadow-soft);padding:24px;
    transition:transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease;
  }
  .automation-mockup-head{
    display:flex;align-items:center;gap:10px;
    padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid var(--border);
  }
  .automation-mockup-head .icon{
    width:32px;height:32px;border-radius:9px;background:var(--green-soft);
    display:flex;align-items:center;justify-content:center;color:var(--green-deep);flex-shrink:0;
  }
  .automation-mockup-head .title{font-family:var(--font-display);font-weight:700;font-size:15.5px;color:var(--stone-800);}
  .toggle-row{
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:14px 16px;background:var(--cream);border-radius:var(--radius-sm);margin-bottom:16px;
  }
  .toggle-row .info{min-width:0;}
  .toggle-row .info .t1{font-size:14.5px;font-weight:600;color:var(--stone-800);}
  .toggle-row .info .t2{font-size:12.5px;color:var(--stone-600);margin-top:2px;}
  .toggle-switch{
    width:44px;height:26px;border-radius:999px;background:var(--green-mid);
    position:relative;flex-shrink:0;
  }
  .toggle-switch::after{
    content:"";position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;
    background:var(--white);box-shadow:0 1px 3px rgba(0,0,0,0.2);
  }
  .preview-label{font-size:12px;color:var(--stone-600);margin-bottom:10px;font-weight:500;}
  .preview-bubble{
    background:var(--green-soft);border-radius:14px 14px 14px 4px;
    padding:13px 16px;font-size:13.5px;color:var(--stone-800);line-height:1.55;margin-bottom:6px;
  }
  .preview-bubble b{color:var(--green-deep);}
  .preview-meta{font-size:11.5px;color:var(--stone-600);padding-left:2px;}

  /* ===== Multi-company ===== */
  .company-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
  @media (max-width:700px){.company-grid{grid-template-columns:1fr;}}
  .company-card{
    background:var(--white);border:1px solid var(--border);border-radius:var(--radius-lg);
    padding:26px;box-shadow:var(--shadow-soft);
  }
  .company-card h3{font-size:17px;font-family:var(--font-display);color:var(--green-deep);margin-bottom:16px;}
  .company-stats{display:flex;gap:22px;flex-wrap:wrap;}
  .company-stats div{font-size:13px;color:var(--stone-600);}
  .company-stats strong{display:block;font-family:var(--font-display);font-size:22px;color:var(--stone-800);}
  .company-note{text-align:center;color:var(--stone-600);font-size:14px;margin-top:28px;}

  /* ===== Audience ===== */
  .audience-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;}
  @media (max-width:900px){.audience-grid{grid-template-columns:repeat(3,1fr);}}
  @media (max-width:560px){.audience-grid{grid-template-columns:repeat(2,1fr);}}
  .audience-card{
    background:var(--white);border:1px solid var(--border);border-radius:var(--radius-md);
    padding:20px 14px;text-align:center;font-size:13.5px;font-weight:600;color:var(--stone-800);
  }

  /* ===== How it works ===== */
  .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;}
  @media (max-width:800px){.steps{grid-template-columns:1fr;gap:28px;}}
  .step .num{font-family:var(--font-mono);font-size:13px;color:var(--green-mid);margin-bottom:12px;}
  .step h3{font-family:var(--font-display);font-size:19px;color:var(--stone-800);margin-bottom:8px;}
  .step p{font-size:14.5px;color:var(--stone-600);}

  /* ===== Security ===== */
  .security{background:var(--green-deep);border-radius:var(--radius-lg);padding:56px 44px;color:var(--white);}
  @media (max-width:700px){.security{padding:40px 24px;}}
  .security h2{color:var(--white);font-size:clamp(24px,3vw,30px);margin-bottom:14px;}
  .security p.lead{color:rgba(255,255,255,0.75);max-width:480px;margin-bottom:28px;font-size:15.5px;}
  .security-list{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
  @media (max-width:700px){.security-list{grid-template-columns:1fr 1fr;}}
  @media (max-width:520px){.security-list{grid-template-columns:1fr;}}
  .security-list span{
    display:flex;align-items:center;gap:9px;font-size:13.5px;color:rgba(255,255,255,0.9);
    background:rgba(255,255,255,0.08);padding:12px 14px;border-radius:10px;
  }

  /* ===== Final CTA ===== */
  .final-cta{text-align:center;max-width:600px;margin:0 auto;}
  .final-cta h2{font-size:clamp(28px,4vw,40px);margin-bottom:16px;}
  .final-cta p{font-size:16.5px;color:var(--stone-600);margin-bottom:32px;}
  .final-cta-actions{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;}

  /* ===== Footer ===== */
  footer{border-top:1px solid var(--border);padding:48px 0 32px;background:var(--white);}
  .footer-grid{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:24px;margin-bottom:32px;}
  .footer-links{display:flex;gap:28px;flex-wrap:wrap;}
  .footer-links a{font-size:14px;color:var(--stone-600);}
  .footer-links a:hover{color:var(--green-mid);}
  .copyright{font-size:13px;color:var(--stone-600);text-align:center;padding-top:24px;border-top:1px solid var(--border);}
  .copyright a{color:var(--green-deep);font-weight:600;transition:color .15s;}
  .copyright a:hover{color:var(--green-mid);}
`
const landingHtml = `<header>
  <div class="container nav">
    <a href="#" class="logo"><span class="logo-mark"></span>Consulta Pro</a>
    <nav class="nav-links">
      <a href="#solucao">Produto</a>
      <a href="#recursos">Recursos</a>
      <a href="#como-funciona">Como funciona</a>
      <a href="#para-quem-e">Para quem é</a>
    </nav>
    <div class="nav-actions">
      <a href="/login" class="btn btn-ghost">Entrar</a>
      <a href="/login" class="btn btn-primary">Começar agora</a>
    </div>
    <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="mobile-panel" id="mobilePanel">
    <a href="#solucao">Produto</a>
    <a href="#recursos">Recursos</a>
    <a href="#como-funciona">Como funciona</a>
    <a href="#para-quem-e">Para quem é</a>
    <a href="/login" class="btn btn-ghost btn-block">Entrar</a>
    <a href="/login" class="btn btn-primary btn-block">Começar agora</a>
  </div>
</header>

<main>

  <!-- HERO -->
  <section class="hero">
    <div class="container hero-grid">
      <div class="reveal">
        <span class="eyebrow">Consulta Pro</span>
        <h1>Seu consultório organizado.<br>Seu atendimento mais simples.</h1>
        <p class="hero-sub">Agenda, pacientes, profissionais e lembretes de WhatsApp em um único lugar.</p>
        <div class="hero-actions">
          <a href="/login" class="btn btn-primary">Começar agora</a>
          <a href="#solucao" class="btn btn-ghost">Conhecer o sistema</a>
        </div>
        <div class="hero-trust">
          <span><span class="dot"></span>Agenda organizada</span>
          <span><span class="dot"></span>Pacientes centralizados</span>
          <span><span class="dot"></span>Lembretes automáticos</span>
        </div>
      </div>

      <div class="reveal">
        <div class="app-card">
          <div class="app-card-head">
            <span class="title">Agenda</span>
            <span class="today-badge">Hoje</span>
          </div>
          <div class="agenda-row">
            <span class="agenda-time">10:45</span>
            <span class="agenda-bar"></span>
            <div class="agenda-info">
              <div class="patient">João Silva</div>
              <div class="pro">Dr. Carlos Mendes</div>
            </div>
          </div>
          <div class="agenda-row">
            <span class="agenda-time">11:30</span>
            <span class="agenda-bar"></span>
            <div class="agenda-info">
              <div class="patient">Maria Souza</div>
              <div class="pro">Dra. Marina Costa</div>
            </div>
          </div>
          <div class="agenda-row">
            <span class="agenda-time">14:00</span>
            <span class="agenda-bar"></span>
            <div class="agenda-info">
              <div class="patient">Pedro Alves</div>
              <div class="pro">Dr. Rafael Lima</div>
            </div>
          </div>
          <div class="wa-mini">
            <span class="wa-dot"></span>
            <div>
              <div class="t1">WhatsApp conectado</div>
              <div class="t2">6 lembretes enviados hoje</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- TRUST BAR -->
  <section class="trust-bar" style="padding-top:36px;padding-bottom:36px;">
    <div class="container reveal">
      <p>Feito para quem precisa cuidar do atendimento, não da planilha.</p>
      <div class="trust-items">
        <span><span class="dot"></span>Agenda organizada</span>
        <span><span class="dot"></span>Pacientes centralizados</span>
        <span><span class="dot"></span>Lembretes automáticos</span>
        <span><span class="dot"></span>Dados isolados por empresa</span>
      </div>
    </div>
  </section>

  <!-- PROBLEMA -->
  <section>
    <div class="container">
      <div class="section-head center reveal">
        <h2>Menos tarefas manuais. Mais tempo para atender.</h2>
      </div>
      <div class="problem-grid reveal">
        <div class="before-card">
          <div class="before-list">
            <div class="before-item"><span class="x">✕</span>Agenda espalhada entre caderno, WhatsApp e planilha</div>
            <div class="before-item"><span class="x">✕</span>Pacientes cadastrados em planilhas soltas</div>
            <div class="before-item"><span class="x">✕</span>Confirmação de horário feita uma a uma, manualmente</div>
            <div class="before-item"><span class="x">✕</span>Mensagens de lembrete enviadas paciente por paciente</div>
            <div class="before-item"><span class="x">✕</span>Difícil acompanhar quem já foi atendido e quem falta</div>
          </div>
        </div>
        <div>
          <h3 style="font-family:var(--font-body);font-weight:600;font-size:17px;color:var(--stone-800);margin-bottom:12px;">O que muda com o Consulta Pro</h3>
          <p style="color:var(--stone-600);font-size:15.5px;">Sua agenda, seus pacientes e seus lembretes passam a viver em um único sistema — simples de configurar e simples de usar todos os dias, sozinho ou em equipe.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SOLUÇÃO -->
  <section id="solucao">
    <div class="container">
      <div class="section-head center reveal">
        <span class="eyebrow" style="justify-content:center;">Solução</span>
        <h2>Tudo que seu consultório precisa em um só lugar.</h2>
      </div>
      <div class="features-grid reveal" id="recursos">
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>
          </div>
          <h3>Agenda</h3>
          <p>Organize consultas e atendimentos em uma agenda simples e visual.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-1a4 4 0 0 0-3-3.87M16 3.6a3.5 3.5 0 0 1 0 6.8"/></svg>
          </div>
          <h3>Pacientes</h3>
          <p>Tenha os dados e histórico dos seus pacientes centralizados.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 7 12 3 4 7l8 4 8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>
          </div>
          <h3>Profissionais</h3>
          <p>Gerencie um profissional ou uma equipe inteira.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>
          </div>
          <h3>WhatsApp</h3>
          <p>Conecte o WhatsApp do consultório e acompanhe as mensagens.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          </div>
          <h3>Automações</h3>
          <p>Envie lembretes automaticamente antes dos atendimentos.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18M7 15l4-4 3 3 5-6"/></svg>
          </div>
          <h3>Gestão</h3>
          <p>Tenha uma visão clara da operação do seu consultório.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- AGENDA -->
  <section>
    <div class="container split">
      <div class="split-text reveal">
        <span class="eyebrow">Agenda</span>
        <h2>Uma agenda que acompanha sua rotina.</h2>
        <p>Visualize seus atendimentos por dia, semana ou mês e saiba exatamente o que acontece no seu consultório — com um profissional ou com a equipe toda.</p>
      </div>
      <div class="split-visual reveal">
        <div class="week-mockup">
          <div class="week-tabs">
            <span>Dia</span><span class="active">Semana</span><span>Mês</span>
          </div>
          <div class="week-grid">
            <div class="hour-col">
              <div class="hour-cell">08:00</div>
              <div class="hour-cell">09:00</div>
              <div class="hour-cell">10:00</div>
              <div class="hour-cell">11:00</div>
              <div class="hour-cell">12:00</div>
              <div class="hour-cell">13:00</div>
              <div class="hour-cell">14:00</div>
            </div>
            <div class="slots-col" style="height:336px;">
              <div class="slot" style="top:118px;height:54px;width:92%;">João Silva<small>Dr. Carlos Mendes · 10:45</small></div>
              <div class="slot" style="top:186px;height:54px;width:92%;">Maria Souza<small>Dra. Marina Costa · 11:30</small></div>
              <div class="slot" style="top:294px;height:54px;width:92%;">Pedro Alves<small>Dr. Rafael Lima · 14:00</small></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- WHATSAPP -->
  <section style="background:var(--white);border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
    <div class="container split reverse">
      <div class="split-text reveal">
        <span class="eyebrow">WhatsApp</span>
        <h2>Seu WhatsApp trabalhando junto com sua agenda.</h2>
        <p>Pare de lembrar manualmente cada paciente. O Consulta Pro pode enviar lembretes automaticamente antes do atendimento.</p>
      </div>
      <div class="split-visual reveal">
        <div class="chat-mockup">
          <div class="chat-header">
            <span class="chat-avatar"></span>
            <div>
              <div class="name">Consulta Pro</div>
              <div class="status">online</div>
            </div>
          </div>
          <div class="bubble">Olá! Tudo bem, João? Este é um lembrete para o seu atendimento amanhã, 3 de setembro às 10:45.</div>
          <div class="bubble-meta"><span>Enviado</span><span>Entregue</span></div>
          <div class="chat-stats">
            <div class="chat-stat"><div class="num">18</div><div class="lbl">Mensagens hoje</div></div>
            <div class="chat-stat"><div class="num">6</div><div class="lbl">Lembretes enviados</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- AUTOMAÇÕES -->
  <section>
    <div class="container split">
      <div class="split-text reveal">
        <span class="eyebrow">Automações</span>
        <h2>Configure uma vez. Deixe o sistema cuidar do resto.</h2>
        <p>Ligue o lembrete uma única vez e pronto — o Consulta Pro avisa cada paciente no momento certo, sem você precisar mexer em nada depois.</p>
      </div>
      <div class="split-visual reveal">
        <div class="automation-mockup">
          <div class="automation-mockup-head">
            <span class="icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </span>
            <span class="title">Lembrete de consulta</span>
          </div>
          <div class="toggle-row">
            <div class="info">
              <div class="t1">Avisar o paciente 1 dia antes</div>
              <div class="t2">Enviado sozinho pelo WhatsApp</div>
            </div>
            <span class="toggle-switch"></span>
          </div>
          <div class="preview-label">É assim que o paciente recebe</div>
          <div class="preview-bubble">Olá, <b>João</b>! Passando pra lembrar do seu atendimento amanhã, <b>3 de setembro às 10:45</b>, com <b>Dr. Carlos</b>.</div>
          <div class="preview-meta">Enviado automaticamente · nenhuma ação necessária</div>
        </div>
      </div>
    </div>
  </section>

  <!-- MULTI-EMPRESA -->
  <section style="background:var(--white);border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
    <div class="container">
      <div class="section-head center reveal">
        <span class="eyebrow" style="justify-content:center;">Ambientes separados</span>
        <h2>Cada consultório possui seu próprio ambiente.</h2>
        <p>Cada empresa possui seu próprio ambiente e seus próprios dados.</p>
      </div>
      <div class="company-grid reveal">
        <div class="company-card">
          <h3>Clínica Médica Santiago</h3>
          <div class="company-stats">
            <div><strong>3</strong>Profissionais</div>
            <div><strong>1</strong>WhatsApp</div>
            <div><strong>24</strong>Pacientes</div>
          </div>
        </div>
        <div class="company-card">
          <h3>Consultório Psicologia</h3>
          <div class="company-stats">
            <div><strong>1</strong>Profissional</div>
            <div><strong>1</strong>WhatsApp</div>
            <div><strong>12</strong>Pacientes</div>
          </div>
        </div>
      </div>
      <p class="company-note reveal">Os dados de cada empresa ficam completamente independentes.</p>
    </div>
  </section>

  <!-- PARA QUEM É -->
  <section id="para-quem-e">
    <div class="container">
      <div class="section-head center reveal">
        <h2>Um sistema que se adapta ao seu consultório.</h2>
        <p>Funciona tanto para quem atende sozinho quanto para equipes inteiras.</p>
      </div>
      <div class="audience-grid reveal">
        <div class="audience-card">Psicólogos</div>
        <div class="audience-card">Consultórios médicos</div>
        <div class="audience-card">Clínicas</div>
        <div class="audience-card">Profissionais autônomos</div>
        <div class="audience-card">Pequenas equipes</div>
      </div>
    </div>
  </section>

  <!-- COMO FUNCIONA -->
  <section id="como-funciona" style="background:var(--white);border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
    <div class="container">
      <div class="section-head center reveal">
        <h2>Como funciona</h2>
      </div>
      <div class="steps reveal">
        <div class="step">
          <div class="num">01</div>
          <h3>Cadastre seu consultório</h3>
          <p>Crie seu ambiente em minutos, sem instalação.</p>
        </div>
        <div class="step">
          <div class="num">02</div>
          <h3>Organize profissionais, pacientes e agenda</h3>
          <p>Centralize as informações que hoje estão espalhadas.</p>
        </div>
        <div class="step">
          <div class="num">03</div>
          <h3>Automatize seus lembretes</h3>
          <p>Conecte o WhatsApp e deixe o sistema avisar seus pacientes.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- SEGURANÇA -->
  <section>
    <div class="container reveal">
      <div class="security">
        <h2>Seus dados pertencem ao seu consultório.</h2>
        <p class="lead">Cada empresa tem seu próprio ambiente, com autenticação e controle de acesso dedicados.</p>
        <div class="security-list">
          <span>Ambientes separados por empresa</span>
          <span>Login seguro para cada pessoa</span>
          <span>Você controla quem acessa o quê</span>
          <span>Seus dados não se misturam com os de outra empresa</span>
          <span>Estrutura pensada para proteger suas informações</span>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section>
    <div class="container final-cta reveal">
      <h2>Pronto para organizar seu consultório?</h2>
      <p>Comece a centralizar sua agenda, seus pacientes e seus atendimentos.</p>
      <div class="final-cta-actions">
        <a href="/login" class="btn btn-primary">Começar agora</a>
        <a href="/login" class="btn btn-ghost">Entrar</a>
      </div>
    </div>
  </section>

</main>

<footer>
  <div class="container">
    <div class="footer-grid">
      <a href="#" class="logo"><span class="logo-mark"></span>Consulta Pro</a>
      <div class="footer-links">
        <a href="#solucao">Produto</a>
        <a href="#recursos">Recursos</a>
        <a href="#">Privacidade</a>
        <a href="#">Termos</a>
        <a href="/login">Entrar</a>
      </div>
    </div>
    <p class="copyright">© 2026 Consulta Pro - Desenvolvido por <a href="https://www.linkedin.com/in/harris-alexandre/" target="_blank" rel="noopener noreferrer">Harris Alexandre</a></p>
  </div>
</footer>`

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const menuToggle = root.querySelector<HTMLButtonElement>('#menuToggle')
    const mobilePanel = root.querySelector<HTMLElement>('#mobilePanel')
    const closeMenu = () => {
      mobilePanel?.classList.remove('open')
      menuToggle?.setAttribute('aria-expanded', 'false')
    }

    const onMenu = () => {
      const isOpen = mobilePanel?.classList.toggle('open') ?? false
      menuToggle?.setAttribute('aria-expanded', String(isOpen))
    }

    menuToggle?.addEventListener('click', onMenu)
    mobilePanel?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu))

    const revealEls = Array.from(root.querySelectorAll<HTMLElement>('.reveal'))
    let observer: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            observer?.unobserve(entry.target)
          }
        })
      }, { threshold: 0.12 })
      revealEls.forEach((el) => observer?.observe(el))
    } else {
      revealEls.forEach((el) => el.classList.add('in'))
    }

    return () => {
      menuToggle?.removeEventListener('click', onMenu)
      mobilePanel?.querySelectorAll('a').forEach((a) => a.removeEventListener('click', closeMenu))
      observer?.disconnect()
    }
  }, [])

  return <div ref={rootRef} className="public-landing">
    <style>{landingCss}</style>
    <div dangerouslySetInnerHTML={{ __html: landingHtml }} />
  </div>
}
