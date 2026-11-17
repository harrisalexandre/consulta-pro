import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!, key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(url,key);
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST") return out({error:"method_not_allowed"},405);
 const auth=req.headers.get("authorization")||"";
 const expected=Deno.env.get("CRON_WORKER_TOKEN");
 if(!expected || auth!==`Bearer ${expected}`) return out({error:"unauthorized"},401);
 const {data,error}=await admin.rpc("claim_automation_dispatches",{batch_size:10});
 if(error)return out({error:error.message},500);
 return out({claimed:(data||[]).length,dispatches:data||[]});
});
