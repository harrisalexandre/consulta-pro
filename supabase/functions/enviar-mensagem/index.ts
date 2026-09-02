import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
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

  return Boolean(membership && ["owner", "admin", "attendant"].includes(membership.role))
}

function normalizeNumber(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "")
  if (digits.startsWith("55")) return digits
  if (digits.length === 10 || digits.length === 11) return "55" + digits
  return digits
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
  if (!response.ok) throw new Error(`Evolution API ${response.status}: ${JSON.stringify(data).slice(0, 500)}`)
  return data
}

function providerMessageId(data: any) {
  return data?.key?.id || data?.data?.key?.id || data?.message?.key?.id || data?.id || null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({})
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const body = await req.json().catch(() => ({}))
  const companyId = String(body.company_id || "")
  const recipient = normalizeNumber(body.recipient_number)
  const message = String(body.message || "").trim()

  if (!companyId) return json({ error: "company_id_required" }, 400)
  if (!recipient) return json({ error: "recipient_number_required" }, 400)
  if (!message) return json({ error: "message_required" }, 400)
  if (!await authorize(req, companyId)) return json({ error: "forbidden" }, 403)

  const { data: integration, error: integrationError } = await db
    .from("whatsapp_integrations")
    .select("id, instance_name, status")
    .eq("company_id", companyId)
    .eq("provider", "evolution")
    .maybeSingle()

  if (integrationError) return json({ error: integrationError.message }, 500)
  if (!integration?.id || !integration.instance_name) return json({ error: "whatsapp_not_configured" }, 409)
  if (integration.status !== "connected") return json({ error: "whatsapp_not_connected" }, 409)

  try {
    const result = await evolution(`/message/sendText/${encodeURIComponent(integration.instance_name)}`, {
      method: "POST",
      body: JSON.stringify({
        number: recipient,
        text: message,
      }),
    })

    const providerId = providerMessageId(result)
    const now = new Date().toISOString()
    const { data: row, error: insertError } = await db
      .from("whatsapp_messages")
      .insert({
        company_id: companyId,
        integration_id: integration.id,
        patient_id: body.patient_id || null,
        recipient_number: recipient,
        direction: "outbound",
        kind: body.kind === "automatic" ? "automatic" : "manual",
        body: message,
        provider_message_id: providerId,
        status: "sent",
        sent_at: now,
      })
      .select("id, provider_message_id, sent_at")
      .single()

    if (insertError) throw new Error(insertError.message)

    return json({ ok: true, message_id: row.id, provider_message_id: row.provider_message_id, sent_at: row.sent_at })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    await db.from("whatsapp_messages").insert({
      company_id: companyId,
      integration_id: integration.id,
      patient_id: body.patient_id || null,
      recipient_number: recipient,
      direction: "outbound",
      kind: body.kind === "automatic" ? "automatic" : "manual",
      body: message,
      status: "failed",
      sent_at: null,
    })
    return json({ error: detail.slice(0, 500) }, 502)
  }
})
