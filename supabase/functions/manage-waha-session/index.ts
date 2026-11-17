import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return out({error:"method_not_allowed"},405);
 const auth=req.headers.get("authorization")||"";
 const jwt=auth.replace(/^Bearer\s+/,"");
 const {data:{user},error:ue}=await sb.auth.getUser(jwt);
 if(ue||!user)return out({error:"unauthorized"},401);
 const {data:membership}=await sb.from("company_users").select("company_id,role").eq("user_id",user.id).maybeSingle();
 if(!membership || !["owner","admin"].includes(membership.role))return out({error:"forbidden"},403);
 const wahaUrl=Deno.env.get("WAHA_URL");
 const apiKey=Deno.env.get("WAHA_API_KEY");
 if(!wahaUrl)return out({error:"WAHA_URL_not_configured"},500);
 const body=await req.json().catch(()=>({}));
 const action=body.action||"status";
 const instance=String(body.instance_name||`consulta-pro-${membership.company_id}`).replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,50);
 const call=async(path:string,init:RequestInit={})=>{
   const r=await fetch(wahaUrl.replace(/\/$/,"")+path,{...init,headers:{"Content-Type":"application/json",...(apiKey?{"X-Api-Key":apiKey}:{}),...(init.headers||{})}});
   const t=await r.text(); if(!r.ok)throw new Error(`WAHA ${r.status}: ${t.slice(0,300)}`);
   try{return JSON.parse(t)}catch{return {raw:t}};
 };
 try{
   if(action==="start"){
     try{await call("/api/sessions",{method:"POST",body:JSON.stringify({name:instance,start:true})});}catch(e){if(!String(e).includes("already"))throw e;}
   }
   const session=await call(`/api/sessions/${encodeURIComponent(instance)}`);
   let qr=null;
   if(action==="qr" || action==="start"){
     try{qr=await call(`/api/${encodeURIComponent(instance)}/auth/qr`);}catch{}
   }
   const state=String(session.status||session.state||"").toLowerCase();
   const connected=["working","connected","authenticated"].includes(state);
   const status=connected?"connected":state.includes("scan")||state.includes("connecting")?"connecting":"disconnected";
   await sb.rpc("upsert_waha_integration",{target_company:membership.company_id,target_instance:instance,target_status:status,target_phone:session.me||session.phoneNumber||null,target_error:null});
   return out({instance,status,session,qr});
 }catch(e){
   const message=e instanceof Error?e.message:String(e);
   await sb.rpc("upsert_waha_integration",{target_company:membership.company_id,target_instance:instance,target_status:"error",target_phone:null,target_error:message});
   return out({error:message},502);
 }
});
