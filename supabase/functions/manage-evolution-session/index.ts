import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "https://consulta-pro.onrender.com", "access-control-allow-headers": "authorization, x-client-info, apikey, content-type", "access-control-allow-methods": "POST, OPTIONS" },
  })

async function authorize(req: Request, companyId: string) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  if (!jwt) return false

  const { data: { user }, error } = await db.auth.getUser(jwt)
  if (error || !user) return false

  const { data: membership } = await db
    .from("company_users")
    .select("company_id, role, status")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .eq("status", "active")
    .maybeSingle()

  return Boolean(membership && ["owner", "admin"].includes(membership.role))
}

async function evolution(path: string, init: RequestInit = {}) {
  const base = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "")
  const key = Deno.env.get("EVOLUTION_API_KEY") || ""
  if (!base || !key) throw new Error("Evolution API não configurada")

  const response = await fetch(base + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  })

  const raw = await response.text()
  let data: any = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = { raw: raw.slice(0, 500) } }

  if (!response.ok) {
    throw new Error(`Evolution API ${response.status}: ${JSON.stringify(data).slice(0, 500)}`)
  }

  return data
}

function instanceName(companyId: string, configured?: string | null) {
  return String(configured || `consulta-pro-${companyId}`)
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 50)
}

function qrFrom(data: any): string | null {
  const raw =
    data?.base64 ??
    data?.qrcode?.base64 ??
    data?.qrcode?.code ??
    data?.code ??
    data?.qr?.base64 ??
    data?.qr?.code

  if (typeof raw !== "string" || !raw.trim()) return null
  const value = raw.trim()
  return /^data:image\//i.test(value)
    ? value
    : `data:image/png;base64,${value.replace(/\s+/g, "")}`
}

function phoneFrom(data: any): string | null {
  const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [data]
  const row = rows[0] || {}
  const value = row.number || row.owner || row.ownerJid || row.wid || row.jid || null
  return typeof value === "string" ? value.split("@")[0] : null
}

async function saveIntegration(companyId: string, instance: string, status: string, phone: string | null, lastError: string | null) {
  const now = new Date().toISOString()
  const { data: existing } = await db
    .from("whatsapp_integrations")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle()

  const payload = {
    company_id: companyId,
    provider: "evolution",
    instance_name: instance,
    phone_number: phone,
    status,
    last_error: lastError,
    last_sync_at: now,
    ...(status === "connected" ? { connected_at: now } : {}),
    updated_at: now,
  }

  if (existing?.id) {
    await db.from("whatsapp_integrations").update(payload).eq("id", existing.id)
  } else {
    await db.from("whatsapp_integrations").insert({ ...payload, created_at: now })
  }
}

async function configureWebhook(instance: string) {
  const url = `${SUPABASE_URL}/functions/v1/receive-evolution-webhook`
  await evolution(`/webhook/set/${encodeURIComponent(instance)}`, {
    method: "POST",
    body: JSON.stringify({
      enabled: true,
      url,
      webhookByEvents: false,
      webhookBase64: false,
      events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE"],
    }),
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({})
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const body = await req.json().catch(() => ({}))
  const companyId = String(body.company_id || "")
  if (!companyId) return json({ error: "company_id_required" }, 400)
  if (!await authorize(req, companyId)) return json({ error: "forbidden" }, 403)

  const { data: integration } = await db
    .from("whatsapp_integrations")
    .select("id, instance_name, status, phone_number")
    .eq("company_id", companyId)
    .maybeSingle()

  const instance = instanceName(companyId, integration?.instance_name)
  const action = String(body.action || "status")

  try {
    if (action === "disconnect") {
      try { await evolution(`/instance/logout/${encodeURIComponent(instance)}`, { method: "DELETE" }) } catch {}
      await saveIntegration(companyId, instance, "disconnected", null, null)
      return json({ ok: true, instance, status: "disconnected", phone_number: null })
    }

    if (action === "start") {
      let existingState = ""
      try {
        const existing = await evolution("/instance/connectionState/" + encodeURIComponent(instance))
        existingState = String(existing?.instance?.state || existing?.state || "").toLowerCase()
      } catch {}

      if (existingState === "close" || existingState === "closed") {
        try { await evolution("/instance/delete/" + encodeURIComponent(instance), { method: "DELETE" }) } catch {}
      }

      try {
        await evolution("/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName: instance,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            webhook: {
              enabled: true,
              url: SUPABASE_URL + "/functions/v1/receive-evolution-webhook",
              webhookByEvents: false,
              webhookBase64: false,
              events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE"],
            },
          }),
        })
      } catch (error) {
        if (!/already|exists|duplicate/i.test(String(error))) throw error
      }
      await configureWebhook(instance)
    }

    const state = await evolution(`/instance/connectionState/${encodeURIComponent(instance)}`)
    const rawState = String(state?.instance?.state || state?.state || "").toLowerCase()

    if (rawState === "open") {
      let phone = integration?.phone_number || null
      try { phone = phoneFrom(await evolution(`/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`)) || phone } catch {}
      await saveIntegration(companyId, instance, "connected", phone, null)
      return json({ ok: true, instance, status: "connected", phone_number: phone, qr: null })
    }

    let qr: string | null = null
    if (action === "start" || action === "qr") {
      const connected = await evolution(`/instance/connect/${encodeURIComponent(instance)}`)
      qr = qrFrom(connected)
    }

    const status = qr || rawState.includes("connect") || rawState.includes("qr")
      ? "connecting"
      : rawState.includes("close") || rawState.includes("disconnect")
        ? "disconnected"
        : "connecting"

    await saveIntegration(companyId, instance, status, integration?.phone_number || null, null)
    return json({ ok: true, instance, status, phone_number: integration?.phone_number || null, qr })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await saveIntegration(companyId, instance, "error", null, message.slice(0, 500))
    return json({ error: message.slice(0, 500) }, 502)
  }
})
