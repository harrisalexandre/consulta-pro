import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { enviarTexto, EvolutionError, renderizar, variaveis } from "../_shared/mensagem.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (x: unknown, s = 200) =>
  new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json" } });

/**
 * Worker das mensagens automaticas (pg_cron a cada minuto).
 * As regras (consulta ainda valida, paciente ativo, SAIR, numero, janela de
 * envio, intervalo minimo por paciente, WhatsApp conectado, pausa) ficam no
 * banco em prepare_automation_dispatch. Aqui so renderiza, envia e registra.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.max(1, Math.min(Number(body.batch_size) || 10, 50));

  const { data: dispatches, error: claimError } = await admin.rpc(
    "claim_automation_dispatches", { batch_size: batchSize },
  );
  if (claimError) return json({ error: claimError.message }, 500);

  const resumo: Record<string, number> = { sent: 0, failed: 0 };
  const naoLogadas: string[] = [];

  for (const d of dispatches ?? []) {
    try {
      const { data: prep, error: pe } = await admin.rpc("prepare_automation_dispatch", { p_dispatch_id: d.id });
      if (pe) throw pe;
      if (prep?.action !== "send") {
        resumo[prep?.action || "ignore"] = (resumo[prep?.action || "ignore"] || 0) + 1;
        continue;
      }

      const { texto, problema } = renderizar(
        String(prep.body || ""),
        variaveis({
          patientName: prep.patient_name,
          startsAt: prep.starts_at,
          appointmentType: prep.appointment_type,
          professionalName: prep.professional_name,
          company: prep.company,
        }),
        Boolean(prep.appointment_id),
      );
      if (problema) {
        await admin.rpc("mark_automation_dispatch_needs_action", {
          p_dispatch_id: d.id, p_code: problema.code, p_reason: problema.reason,
        });
        resumo.needs_action = (resumo.needs_action || 0) + 1;
        continue;
      }

      let enviado;
      try {
        enviado = await enviarTexto(prep.instance_name, prep.recipient_number, texto);
      } catch (err) {
        if (err instanceof EvolutionError && err.naoTemWhatsapp) {
          await admin.rpc("mark_automation_dispatch_needs_action", {
            p_dispatch_id: d.id, p_code: "number_not_on_whatsapp",
            p_reason: "Este número não tem WhatsApp. Confira o cadastro do paciente.",
          });
          resumo.needs_action = (resumo.needs_action || 0) + 1;
          continue;
        }
        throw err;
      }

      const { error: sentError } = await admin.rpc(
        "mark_automation_dispatch_sent", { dispatch_id: d.id, provider_id: enviado.providerId },
      );
      if (sentError) throw sentError;

      const { error: logError } = await admin.from("whatsapp_messages").insert({
        company_id: d.company_id,
        integration_id: prep.integration_id,
        patient_id: prep.patient_id ?? null,
        recipient_number: String(prep.recipient_number),
        direction: "outbound",
        kind: "automatic",
        body: texto,
        provider_message_id: enviado.providerId || null,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      if (logError) naoLogadas.push(`${d.id}: ${logError.message}`);
      resumo.sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await admin.rpc("mark_automation_dispatch_failed", { dispatch_id: d.id, error_message: message });
      resumo.failed++;
    }
  }

  return json({ processed: (dispatches ?? []).length, ...resumo, nao_logadas: naoLogadas });
});
