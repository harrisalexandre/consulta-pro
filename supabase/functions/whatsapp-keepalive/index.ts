import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enviarTexto } from "../_shared/mensagem.ts";

// Keepalive (pg_cron a cada 10 min): consulta o estado de cada instancia na
// Evolution, atualiza whatsapp_integrations (status/last_sync_at) e envia os
// avisos "algo parou" das empresas (claim_messaging_alerts, max 1/hora).
// Tambem mantem o servico da Evolution acordado.

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const json = (x: unknown, s = 200) =>
  new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json" } });

async function estado(instance: string): Promise<{ state: string | null; http: number }> {
  const base = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
  const key = Deno.env.get("EVOLUTION_API_KEY") || "";
  if (!base || !key) throw new Error("Evolution API não configurada");
  const r = await fetch(`${base}/instance/connectionState/${encodeURIComponent(instance)}`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(45000),
  });
  const raw = await r.text();
  if (!r.ok) return { state: null, http: r.status };
  let data: any = {};
  try { data = JSON.parse(raw); } catch { /* */ }
  return { state: String(data?.instance?.state || data?.state || "").toLowerCase() || null, http: r.status };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const { data: integracoes, error } = await db.from("whatsapp_integrations")
    .select("id,company_id,instance_name,status")
    .eq("provider", "evolution").not("instance_name", "is", null);
  if (error) return json({ error: error.message }, 500);

  const resultado: unknown[] = [];
  for (const w of integracoes ?? []) {
    const agora = new Date().toISOString();
    try {
      const { state, http } = await estado(w.instance_name!);
      let status: string;
      if (state === "open") status = "connected";
      else if (state === "connecting") status = "connecting";
      else if (state === "close" || http === 404) status = "disconnected";
      else status = w.status;
      // logo apos ler o QR a instancia passa por "close" para concluir o
      // pareamento: nao derrubar o estado "connecting" nesse momento.
      if (w.status === "connecting" && status === "disconnected" && http !== 404) status = "connecting";

      const patch: Record<string, unknown> = { last_sync_at: agora };
      if (status !== w.status) {
        patch.status = status;
        patch.last_error = null;
        if (status === "connected") patch.connected_at = agora;
      } else if (status === "connected") {
        patch.last_error = null;
      }
      await db.from("whatsapp_integrations").update(patch).eq("id", w.id);
      resultado.push({ company_id: w.company_id, from: w.status, to: status });
    } catch (err) {
      // Evolution sem resposta (ex.: servico acordando). Nao muda o status:
      // um timeout nao prova que o WhatsApp caiu. Fica so o registro.
      console.error("keepalive", w.company_id, err instanceof Error ? err.message : String(err));
      await db.from("whatsapp_integrations").update({
        last_error: "Não foi possível verificar a conexão do WhatsApp",
      }).eq("id", w.id);
      resultado.push({ company_id: w.company_id, from: w.status, to: w.status, checked: false });
    }
  }

  const avisos: unknown[] = [];
  const { data: alertas, error: ae } = await db.rpc("claim_messaging_alerts");
  if (ae) console.error("claim_messaging_alerts", ae.message);
  for (const a of alertas ?? []) {
    try {
      await enviarTexto(a.instance_name, a.alert_number, a.message);
      avisos.push({ company_id: a.company_id, ok: true });
    } catch (err) {
      console.error("alerta", a.company_id, err instanceof Error ? err.message : String(err));
      avisos.push({ company_id: a.company_id, ok: false });
    }
  }

  return json({ checked: resultado.length, integrations: resultado, alerts: avisos });
});
