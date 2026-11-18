// Renderizacao das mensagens automaticas (compartilhado pelo worker e pelo
// envio de teste). Etiquetas da tela -> chave no texto:
//   Nome do paciente -> {{nome}}      Data -> {{data}}       Hora -> {{hora}}
//   Dia da semana -> {{dia_semana}}   Profissional -> {{profissional}}
//   Nome do consultorio -> {{consultorio}}
//   Endereco do consultorio -> {{endereco}}
// Aceitas tambem (legado): nome_completo, empresa, dia, tipo.

export const FUSO_PADRAO = "America/Sao_Paulo";

export type Empresa = {
  name?: string | null; timezone?: string | null; street?: string | null; number?: string | null;
  complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null;
};

export type Contexto = {
  patientName?: string | null;
  startsAt?: string | null;
  appointmentType?: string | null;
  professionalName?: string | null;
  company?: Empresa | null;
};

const CAMPOS_CONSULTA = new Set(["data", "dia", "hora", "dia_semana", "tipo", "profissional"]);
const CONHECIDAS = new Set([
  "nome", "nome_completo", "profissional", "consultorio", "empresa", "data", "dia", "hora",
  "dia_semana", "tipo", "endereco",
]);

/** Cadastros guardam o numero BR sem DDI (10/11 digitos); a Evolution exige o 55. */
export function numeroWhatsapp(numero: string) {
  const d = String(numero).replace(/\D/g, "");
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
}

export function enderecoDaEmpresa(c?: Empresa | null): string | null {
  const rua = (c?.street || "").trim();
  const cidade = (c?.city || "").trim();
  if (!rua || !cidade) return null;
  let s = rua;
  if ((c?.number || "").trim()) s += `, ${c!.number!.trim()}`;
  if ((c?.complement || "").trim()) s += ` - ${c!.complement!.trim()}`;
  if ((c?.neighborhood || "").trim()) s += ` - ${c!.neighborhood!.trim()}`;
  s += `, ${cidade}`;
  if ((c?.state || "").trim()) s += `/${c!.state!.trim()}`;
  return s;
}

export function variaveis(ctx: Contexto): Record<string, string> {
  const fuso = ctx.company?.timezone || FUSO_PADRAO;
  const vars: Record<string, string> = {};
  const nomeCompleto = (ctx.patientName || "").trim();
  if (nomeCompleto) {
    vars.nome = nomeCompleto.split(/\s+/)[0];
    vars.nome_completo = nomeCompleto;
  }
  if ((ctx.professionalName || "").trim()) vars.profissional = ctx.professionalName!.trim();
  if ((ctx.company?.name || "").trim()) { vars.consultorio = ctx.company!.name!.trim(); vars.empresa = vars.consultorio; }
  const end = enderecoDaEmpresa(ctx.company);
  if (end) vars.endereco = end;
  if (ctx.startsAt) {
    const d = new Date(ctx.startsAt);
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, ...o }).format(d);
    vars.data = f({ day: "2-digit", month: "2-digit", year: "numeric" });
    vars.dia = f({ day: "2-digit", month: "2-digit" });
    vars.hora = f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    vars.dia_semana = f({ weekday: "long" });
  }
  if ((ctx.appointmentType || "").trim()) vars.tipo = ctx.appointmentType!.trim();
  return vars;
}

export type Problema = { code: string; reason: string };

/**
 * Troca {{chave}} pelo valor. Mensagem com qualquer campo nao resolvido NAO
 * sai: devolve o problema com motivo legivel em pt-BR. Tambem bloqueia
 * {chave} com uma chave so e restos de {{ }}.
 */
export function renderizar(corpo: string, vars: Record<string, string>, temConsulta: boolean):
  { texto: string; problema: Problema | null } {
  const faltando = new Set<string>();
  let texto = corpo.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (m, chave: string) => {
    const v = vars[chave];
    if (v === undefined || v === null || v === "") { faltando.add(chave); return m; }
    return String(v);
  });

  if (faltando.size) {
    const f = [...faltando];
    if (f.some((k) => !CONHECIDAS.has(k))) return { texto, problema: { code: "unknown_field", reason: "A mensagem tem um campo que o sistema não reconhece" } };
    if (f.includes("endereco")) return { texto, problema: { code: "missing_address", reason: "Falta o endereço do consultório" } };
    if (f.some((k) => k === "consultorio" || k === "empresa")) return { texto, problema: { code: "missing_company_name", reason: "Falta o nome do consultório" } };
    if (f.some((k) => k === "nome" || k === "nome_completo")) return { texto, problema: { code: "missing_patient_name", reason: "Paciente sem nome no cadastro" } };
    if (!temConsulta && f.some((k) => CAMPOS_CONSULTA.has(k))) return { texto, problema: { code: "missing_appointment_fields", reason: "A mensagem usa dados de consulta (data, hora ou profissional), mas não há consulta ligada a ela" } };
    if (f.includes("profissional")) return { texto, problema: { code: "missing_professional", reason: "A consulta está sem profissional" } };
    if (f.includes("tipo")) return { texto, problema: { code: "missing_appointment_type", reason: "A consulta está sem tipo de atendimento" } };
    return { texto, problema: { code: "missing_field", reason: "A mensagem tem um campo sem informação" } };
  }

  // {chave} com chave simples, ou restos de {{ }}: nunca enviar
  if (/\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}/.test(texto) || /\{\{|\}\}/.test(texto)) {
    return { texto, problema: { code: "malformed_field", reason: "A mensagem tem um campo escrito de forma errada" } };
  }
  texto = texto.trim();
  if (!texto) return { texto, problema: { code: "template_missing", reason: "A mensagem automática está sem texto" } };
  return { texto, problema: null };
}

export class EvolutionError extends Error {
  constructor(message: string, public status: number, public naoTemWhatsapp: boolean) { super(message); }
}

export async function enviarTexto(instance: string, number: string, text: string) {
  const base = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
  const key = Deno.env.get("EVOLUTION_API_KEY") || "";
  if (!base || !key) throw new EvolutionError("Evolution API não configurada", 0, false);
  const r = await fetch(`${base}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ number: numeroWhatsapp(number), text }),
    signal: AbortSignal.timeout(20000),
  });
  const raw = await r.text();
  if (!r.ok) {
    throw new EvolutionError(`Evolution API ${r.status}: ${raw.slice(0, 500)}`, r.status, /"exists"\s*:\s*false/.test(raw));
  }
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  const providerId = data?.key?.id || data?.message?.key?.id || data?.id || data?.messageId || "";
  return { data, providerId: String(providerId) };
}
