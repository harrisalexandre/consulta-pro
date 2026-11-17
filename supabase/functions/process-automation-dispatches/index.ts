import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (x: unknown, s = 200) =>
  new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json" } });

const FUSO_PADRAO = "America/Sao_Paulo";

/**
 * Cadastros guardam o numero brasileiro sem DDI (DDD + numero, 10 ou 11
 * digitos). A Evolution exige o DDI: sem ele "55991623923" vira outro pais.
 */
function numeroWhatsapp(numero: string) {
  const d = String(numero).replace(/\D/g, "");
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
}

async function send(instance: string, number: string, text: string) {
  const base = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
  const key = Deno.env.get("EVOLUTION_API_KEY") || "";
  if (!base || !key) throw new Error("Evolution API não configurada");
  const r = await fetch(`${base}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ number: numeroWhatsapp(number), text }),
  });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Evolution API ${r.status}: ${raw.slice(0, 500)}`);
  try { return JSON.parse(raw); } catch { return { raw }; }
}

/** Monta as variaveis do agendamento no fuso da empresa. */
function variaveis(agendamento: any, empresa: any) {
  const fuso = empresa?.timezone || FUSO_PADRAO;
  const nomeCompleto = (agendamento?.patients?.full_name || "").trim();
  const vars: Record<string, string> = {};

  if (nomeCompleto) {
    vars.nome = nomeCompleto.split(/\s+/)[0];
    vars.nome_completo = nomeCompleto;
  }
  if (agendamento?.professionals?.name) vars.profissional = agendamento.professionals.name;
  if (empresa?.name) { vars.consultorio = empresa.name; vars.empresa = empresa.name; }

  if (agendamento?.starts_at) {
    const d = new Date(agendamento.starts_at);
    const f = (o: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...o }).format(d);
    vars.data = f({ day: "2-digit", month: "2-digit", year: "numeric" });
    vars.dia = f({ day: "2-digit", month: "2-digit" });
    vars.hora = f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    vars.dia_semana = f({ weekday: "long" });
  }
  if (agendamento?.appointment_type) vars.tipo = agendamento.appointment_type;

  return vars;
}

/**
 * Troca {{variavel}} pelo valor. Devolve o que nao soube resolver.
 * Uma mensagem com chave nao resolvida NAO e enviada: e melhor falhar e
 * aparecer no histórico do que o paciente receber "Olá, {{nome}}".
 */
function renderizar(corpo: string, vars: Record<string, string>) {
  const naoResolvidas = new Set<string>();
  const texto = corpo.replace(
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g,
    (_m, chave: string) => {
      const v = vars[chave];
      if (v === undefined || v === null || v === "") { naoResolvidas.add(chave); return _m; }
      return String(v);
    },
  );
  for (const resto of texto.match(/\{\{[^}]*\}\}/g) || []) naoResolvidas.add(resto.replace(/[{}\s]/g, ""));
  return { texto, naoResolvidas: [...naoResolvidas] };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.max(1, Math.min(Number(body.batch_size) || 10, 50));

  const { data: dispatches, error: claimError } = await admin.rpc(
    "claim_automation_dispatches", { batch_size: batchSize },
  );
  if (claimError) return json({ error: claimError.message }, 500);

  let sent = 0, failed = 0;
  const naoLogadas: string[] = [];

  for (const d of dispatches ?? []) {
    try {
      const { data: integration, error: ie } = await admin
        .from("whatsapp_integrations")
        .select("id,instance_name,status,provider")
        .eq("company_id", d.company_id).eq("provider", "evolution")
        .eq("status", "connected").not("instance_name", "is", null).maybeSingle();
      if (ie) throw ie;
      if (!integration?.instance_name) throw new Error("WhatsApp não conectado para a empresa");

      const { data: automation, error: ae } = await admin
        .from("automations")
        .select("name,channel,message_template,message_template_id")
        .eq("id", d.automation_id).eq("company_id", d.company_id).maybeSingle();
      if (ae) throw ae;
      if (!automation) throw new Error("Automação não encontrada");
      if (automation.channel !== "whatsapp") throw new Error("Canal da automação não é WhatsApp");

      // modelo cadastrado tem prioridade; o texto solto continua como fallback
      let corpo = automation.message_template || "";
      if (automation.message_template_id) {
        const { data: tpl, error: te } = await admin
          .from("message_templates").select("body,active")
          .eq("id", automation.message_template_id).eq("company_id", d.company_id).maybeSingle();
        if (te) throw te;
        if (!tpl) throw new Error("Modelo de mensagem não encontrado");
        if (tpl.active === false) throw new Error("Modelo de mensagem está inativo");
        corpo = tpl.body || "";
      }
      if (!corpo.trim()) throw new Error("Template da automação não configurado");

      const [{ data: agendamento }, { data: empresa }] = await Promise.all([
        d.appointment_id
          ? admin.from("appointments")
              .select("id,patient_id,starts_at,appointment_type,patients(full_name),professionals(name)")
              .eq("id", d.appointment_id).eq("company_id", d.company_id).maybeSingle()
          : Promise.resolve({ data: null }),
        admin.from("companies").select("name,timezone").eq("id", d.company_id).maybeSingle(),
      ]);

      const { texto, naoResolvidas } = renderizar(corpo, variaveis(agendamento, empresa));
      if (naoResolvidas.length) {
        throw new Error(
          `Variáveis não resolvidas no modelo: ${naoResolvidas.map((v) => `{{${v}}}`).join(", ")}. Mensagem não enviada.`,
        );
      }

      const result = await send(integration.instance_name, d.recipient_number, texto);
      const providerId = result?.key?.id || result?.message?.key?.id || result?.id || result?.messageId || "";

      const { error: sentError } = await admin.rpc(
        "mark_automation_dispatch_sent", { dispatch_id: d.id, provider_id: String(providerId) },
      );
      if (sentError) throw sentError;

      // kind usa o enum message_kind (manual|automatic). Antes ia "text", que
      // nao existe no enum: o insert falhava calado e o histórico ficava vazio.
      const { error: logError } = await admin.from("whatsapp_messages").insert({
        company_id: d.company_id,
        integration_id: integration.id,
        patient_id: agendamento?.patient_id ?? null,
        recipient_number: String(d.recipient_number),
        direction: "outbound",
        kind: "automatic",
        body: texto,
        provider_message_id: providerId || null,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      if (logError) naoLogadas.push(`${d.id}: ${logError.message}`);

      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await admin.rpc("mark_automation_dispatch_failed", { dispatch_id: d.id, error_message: message });
      failed++;
    }
  }

  return json({ processed: (dispatches ?? []).length, sent, failed, nao_logadas: naoLogadas });
});
