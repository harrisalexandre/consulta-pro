import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders})
 try{
  const auth=req.headers.get("Authorization"); if(!auth?.startsWith("Bearer ")) return json({error:"authentication required"},401)
  const url=Deno.env.get("SUPABASE_URL")??""; const anon=Deno.env.get("SUPABASE_ANON_KEY")??""; let service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??""
  if(!service){try{const p=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}");service=p.default??p.service_role??p.serviceRole??""}catch{return json({error:"invalid admin key configuration"},500)}}
  if(!url||!anon||!service)return json({error:"Supabase environment is not configured"},500)
  const token=auth.replace(/^Bearer\s+/i,""); const client=createClient(url,anon,{global:{headers:{Authorization:auth}}})
  const {data:{user},error:authErr}=await client.auth.getUser(token); if(authErr||!user)return json({error:"authentication required"},401)
  const admin=createClient(url,service)
  const {data:profile}=await admin.from("profiles").select("is_superadmin").eq("id",user.id).maybeSingle()
  if(!profile?.is_superadmin && user.app_metadata?.role!=="superadmin" && user.app_metadata?.is_superadmin!==true)return json({error:"not authorized"},403)

  const body=await req.json(); const userId=String(body.user_id??"").trim(); const companyId=String(body.company_id??"").trim()
  if(!userId||!companyId)return json({error:"user_id and company_id are required"},400)
  const {data:membership,error:memErr}=await admin.from("company_users").select("user_id,company_id").eq("user_id",userId).eq("company_id",companyId).maybeSingle()
  if(memErr)throw new Error(memErr.message); if(!membership)return json({error:"user is not linked to this company"},404)

  const updates:any={}
  if(body.full_name!==undefined)updates.full_name=String(body.full_name).trim()
  if(body.role!==undefined){const role=body.role==="admin"?"admin":body.role==="owner"?"owner":null;if(!role)return json({error:"invalid role"},400);updates.role=role}
  if(body.status!==undefined){const status=body.status==="inactive"?"inactive":"active";updates.status=status}
  if(Object.keys(updates).length){if(updates.full_name!==undefined){const {error:e}=await admin.from("profiles").update({full_name:updates.full_name}).eq("id",userId);if(e)throw new Error("could not update profile: "+e.message)} const {error:e}=await admin.from("company_users").update({role:updates.role,status:updates.status}).eq("user_id",userId).eq("company_id",companyId);if(e)throw new Error("could not update access: "+e.message)}
  if(body.password){const password=String(body.password);if(password.length<8)return json({error:"password must have at least 8 characters"},400);const {error:e}=await admin.auth.admin.updateUserById(userId,{password});if(e)throw new Error("could not reset password: "+e.message)}
  return json({ok:true})
 }catch(e){const message=e instanceof Error?e.message:"unexpected error";console.error(message);return json({error:message},400)}
})
