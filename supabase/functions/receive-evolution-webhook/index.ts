import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "")

function normalize(value: unknown) {
  let d = digits(value)
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2)
  return d
}

function messageText(message: any) {
  return message?.conversation
    ?? message?.extendedTextMessage?.text
    ?? message?.imageMessage?.caption
    ?? message?.videoMessage?.caption
    ?? message?.documentMessage?.caption
    ?? message?.audioMessage?.caption
    ?? null
}

function extractMessages(payload: any) {
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.messages)) return payload.data.messages
  return payload?.data ? [payload.data] : []
}

async function findIntegration(instance: string) {
  return (await db
    .from("whatsapp_integrations")
    .select("id, company_id, phone_number")
    .eq("instance_name", instance)
    .eq("provider", "evolution")
    .maybeSingle()).data
}

async function findPatient(companyId: string, number: string) {
  const target = normalize(number)
  if (!target) return null

  const { data } = await db
    .from("patients")
    .select("id, phone, whatsapp")
    .eq("company_id", companyId)

  return (data || []).find((patient: any) => {
    return [patient.phone, patient.whatsapp]
      .map(normalize)
      .filter(Boolean)
      .some((value: string) => value === target || value.endsWith(target) || target.endsWith(value))
  })?.id || null
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const expected = Deno.env.get("EVOLUTION_API_KEY") || ""
  const supplied = req.headers.get("apikey") || req.headers.get("x-api-key") || ""
  if (!expected || supplied !== expected) return json({ error: "unauthorized" }, 401)

  const payload = await req.json().catch(() => ({}))
  const event = String(payload.event || "").toUpperCase()
  const instance = String(payload.instance || payload.instanceName || payload.data?.instance || "")

  if (!instance) return json({ ignored: true })
  const integration = await findIntegration(instance)
  if (!integration) return json({ ignored: true })

  if (event === "CONNECTION_UPDATE" || event.includes("CONNECTION")) {
    const state = String(payload.data?.state || payload.data?.instance?.state || "").toLowerCase()
    const status = state === "open" ? "connected" : state.includes("close") ? "disconnected" : "connecting"
    await db.from("whatsapp_integrations").update({
      status,
      last_sync_at: new Date().toISOString(),
      last_error: null,
      ...(status === "connected" ? { connected_at: new Date().toISOString() } : {}),
    }).eq("id", integration.id)
    return json({ ok: true })
  }

  if (!event.includes("MESSAGES_UPSERT") && !event.includes("SEND_MESSAGE")) {
    return json({ ignored: true })
  }

  for (const item of extractMessages(payload)) {
    const key = item?.key || item?.message?.key
    const message = item?.message || item
    const remote = String(key?.remoteJid || item?.remoteJid || "")
    if (!remote || remote.endsWith("@g.us") || remote.includes("@broadcast")) continue

    const number = digits(remote.split("@")[0])
    const patientId = await findPatient(integration.company_id, number)
    const fromMe = Boolean(key?.fromMe)
    const body = messageText(message) || "[Mensagem não textual]"
    const providerId = key?.id || item?.keyId || null

    const row = {
      company_id: integration.company_id,
      integration_id: integration.id,
      patient_id: patientId,
      recipient_number: number,
      direction: fromMe ? "outbound" : "inbound",
      kind: fromMe ? "automatic" : "manual",
      body,
      provider_message_id: providerId,
      status: fromMe ? "sent" : "received",
      sent_at: fromMe ? new Date().toISOString() : null,
    }

    if (providerId) {
      const { data: existing } = await db
        .from("whatsapp_messages")
        .select("id")
        .eq("provider_message_id", providerId)
        .maybeSingle()

      if (existing?.id) {
        await db.from("whatsapp_messages").update(row).eq("id", existing.id)
      } else {
        await db.from("whatsapp_messages").insert(row)
      }
    } else {
      await db.from("whatsapp_messages").insert(row)
    }
  }

  await db.from("whatsapp_integrations").update({
    status: "connected",
    last_sync_at: new Date().toISOString(),
    last_error: null,
  }).eq("id", integration.id)

  return json({ ok: true })
})
