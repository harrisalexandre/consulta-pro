import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enviarTexto, EvolutionError, renderizar, variaveis } from "../_shared/mensagem.ts";

// Envio de TESTE: renderiza a mensagem com um paciente/consulta de exemplo e
// envia para o numero informado. Nao cria disparo de paciente; registra no
// historico (whatsapp_messages) com kind = 'test'. So owner/admin da empresa.

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS = {
  "access-control-allow-origin": "https://consulta-pro.onrender.com",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });
const falha = (status: number, code: string, reason: string) => json({ ok: false, code, reason }, status);

const LIMITE_POR_HORA = 20;

async function autorizar(req: Request, companyId: string) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return false;
  const { data: { user }, error } = await db.auth.getUser(jwt);
  if (error || !user) return false;
  const { data: m } = await db.from("company_users").select("role")
    .eq("user_id", user.id).eq("company_id", companyId).eq("status", "active").maybeSingle();
  if (m && ["owner", "admin"].includes(m.role)) return true;
  const { data: p } = await db.from("profiles").select("is_superadmin").eq("id", user.id).maybeSingle();
  return Boolean(p?.is_superadmin);
}

/** Proximo dia util as 14:30 no fuso da empresa (so para o exemplo). */
function horarioExemplo(fuso: string) {
  const agora = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(agora.getTime() + i * 86400000);
    const dow = new Intl.DateTimeFormat("en-US", { timeZone: fuso, weekday: "short" }).format(d);
    if (dow !== "Sat" && dow !== "Sun") {
      const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(d); // AAAA-MM-DD
      // offset do fuso naquele dia
      const off = new Intl.DateTimeFormat("en-US", { timeZone: fuso, timeZoneName: "longOffset" })
        .formatToParts(d).find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "-03:00";
      return new Date(`${ymd}T14:30:00${off || "Z"}`).toISOString();
    }
  }
  return agora.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return falha(405, "method_not_allowed", "Método não permitido");

  const body = await req.json().catch(() => ({}));
  const companyId = String(body.company_id || "");
  const automationId = body.automation_id ? String(body.automation_id) : null;
  const destino = String(body.to || "").replace(/\D/g, "");
  if (!companyId) return falha(400, "company_id_required", "Empresa não informada");
  if (!await autorizar(req, companyId)) return falha(403, "forbidden", "Você não tem permissão para enviar teste nesta empresa");
  if (destino.length < 10 || destino.length > 13) return falha(400, "invalid_number", "Informe um número de WhatsApp com DDD");

  // texto: da automacao (modelo ligado tem prioridade) ou o informado no corpo
  let corpo = typeof body.body === "string" ? body.body : "";
  let professionalIds: string[] | null = null;
  let temConsulta = true;
  if (automationId) {
    const { data: au } = await db.from("automations")
      .select("type,message_template,message_template_id,professional_ids")
      .eq("id", automationId).eq("company_id", companyId).maybeSingle();
    if (!au) return falha(404, "automation_not_found", "Mensagem automática não encontrada");
    professionalIds = au.professional_ids;
    temConsulta = !["birthday", "patient_recall"].includes(au.type);
    if (!corpo) {
      corpo = au.message_template || "";
      if (au.message_template_id) {
        const { data: tpl } = await db.from("message_templates").select("body")
          .eq("id", au.message_template_id).eq("company_id", companyId).maybeSingle();
        if (tpl?.body) corpo = tpl.body;
      }
    }
  } else if (typeof body.with_appointment === "boolean") {
    temConsulta = body.with_appointment;
  }
  if (!corpo.trim()) return falha(422, "template_missing", "A mensagem está sem texto");

  const { data: empresa } = await db.from("companies")
    .select("name,timezone,street,number,complement,neighborhood,city,state").eq("id", companyId).maybeSingle();

  let profissional = "Dra. Ana Souza";
  let q = db.from("professionals").select("name").eq("company_id", companyId).eq("status", "active").order("name").limit(1);
  if (professionalIds?.length) q = q.in("id", professionalIds);
  const { data: profs } = await q;
  if (profs?.[0]?.name) profissional = profs[0].name;

  const { texto, problema } = renderizar(corpo, variaveis({
    patientName: "Maria Silva",
    startsAt: temConsulta ? horarioExemplo(empresa?.timezone || "America/Sao_Paulo") : null,
    appointmentType: temConsulta ? "Consulta" : null,
    professionalName: temConsulta ? profissional : null,
    company: empresa,
  }), temConsulta);
  if (problema) return json({ ok: false, code: problema.code, reason: problema.reason, preview: texto }, 422);

  const { data: integ } = await db.from("whatsapp_integrations").select("id,instance_name,status")
    .eq("company_id", companyId).eq("provider", "evolution").maybeSingle();
  if (!integ?.instance_name || integ.status !== "connected") {
    return json({ ok: false, code: "whatsapp_disconnected", reason: "O WhatsApp do consultório não está conectado", preview: texto }, 409);
  }

  const desde = new Date(Date.now() - 3600000).toISOString();
  const { count } = await db.from("whatsapp_messages").select("id", { count: "exact", head: true })
    .eq("company_id", companyId).eq("kind", "test").gte("created_at", desde);
  if ((count || 0) >= LIMITE_POR_HORA) {
    return falha(429, "rate_limited", "Muitos testes na última hora. Tente de novo mais tarde.");
  }

  try {
    const enviado = await enviarTexto(integ.instance_name, destino, texto);
    await db.from("whatsapp_messages").insert({
      company_id: companyId, integration_id: integ.id, patient_id: null,
      recipient_number: destino, direction: "outbound", kind: "test", body: texto,
      provider_message_id: enviado.providerId || null, status: "sent", sent_at: new Date().toISOString(),
    });
    return json({ ok: true, text: texto, to: destino });
  } catch (err) {
    if (err instanceof EvolutionError && err.naoTemWhatsapp) {
      return falha(422, "number_not_on_whatsapp", "Este número não tem WhatsApp");
    }
    console.error("send-test-message", err instanceof Error ? err.message : String(err));
    return falha(502, "send_failed", "Não conseguimos enviar agora. Tente de novo em alguns minutos.");
  }
});
