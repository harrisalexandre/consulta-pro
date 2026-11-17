import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "authentication required" }, 401)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    if (!supabaseUrl || !anonKey) {
      return json({ error: "Supabase environment is not configured" }, 500)
    }

    const token = authHeader.replace(/^Bearer\s+/i, "")
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: authData, error: userError } = await userClient.auth.getUser(token)
    if (userError || !authData.user) {
      return json({ error: "authentication required" }, 401)
    }

    const user = authData.user

    let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    if (!serviceKey) {
      const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS")
      if (secretKeysRaw) {
        try {
          const parsed = JSON.parse(secretKeysRaw)
          serviceKey = parsed.default ?? parsed.service_role ?? parsed.serviceRole ?? ""
        } catch {
          return json({ error: "invalid SUPABASE_SECRET_KEYS configuration" }, 500)
        }
      }
    }

    if (!serviceKey) {
      return json({ error: "Supabase admin key is not configured" }, 500)
    }

    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      throw new Error("failed to verify administrator: " + profileError.message)
    }

    const isJwtAdmin =
      user.app_metadata?.role === "superadmin" ||
      user.app_metadata?.is_superadmin === true

    if (!profile?.is_superadmin && !isJwtAdmin) {
      return json({ error: "not authorized" }, 403)
    }

    const body = await req.json()
    const companyId = String(body.company_id ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const fullName = String(body.full_name ?? "").trim()
    const role = body.role === "admin" ? "admin" : "owner"

    if (!companyId || !email || !password || !fullName) {
      return json({ error: "company_id, email, password and full_name are required" }, 400)
    }

    if (password.length < 8) {
      return json({ error: "password must have at least 8 characters" }, 400)
    }

    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .select("id,name")
      .eq("id", companyId)
      .maybeSingle()

    if (companyError) {
      throw new Error("failed to find company: " + companyError.message)
    }

    if (!company) {
      return json({ error: "company not found" }, 404)
    }

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

    if (createError || !created.user) {
      const message = createError?.message ?? "unknown error"
      if (/already|exists|registered/i.test(message)) {
        return json({ error: "Já existe um usuário com este e-mail." }, 409)
      }
      throw new Error("could not create auth user: " + message)
    }

    const userId = created.user.id

    // Supabase can create the profile automatically through the project's
    // auth/profile setup. Therefore this must be an upsert, not a plain insert.
    const { error: profileUpsertError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          is_superadmin: false,
        },
        { onConflict: "id" }
      )

    if (profileUpsertError) {
      await adminClient.auth.admin.deleteUser(userId)
      throw new Error("could not create profile: " + profileUpsertError.message)
    }

    const { error: membershipError } = await adminClient
      .from("company_users")
      .upsert(
        {
          company_id: companyId,
          user_id: userId,
          role,
          status: "active",
        },
        { onConflict: "company_id,user_id" }
      )

    if (membershipError) {
      await adminClient.from("profiles").delete().eq("id", userId)
      await adminClient.auth.admin.deleteUser(userId)
      throw new Error("could not create company access: " + membershipError.message)
    }

    return json({
      ok: true,
      user_id: userId,
      email,
      company: company.name,
      role,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unexpected error"
    console.error("superadmin-create-company-user:", message)
    return json({ error: message }, 400)
  }
})
