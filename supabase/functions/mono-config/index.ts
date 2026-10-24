import { corsHeaders } from '../_shared/supabase.ts';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
Deno.serve(async(request)=>{if(request.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});if(request.method!=='POST')return json({error:'Method not allowed.'},405);const configured=Deno.env.get('MONO_ENABLED')==='true'&&Boolean(Deno.env.get('MONO_SEC_KEY'))&&Boolean(Deno.env.get('APP_URL'));return json({enabled:configured})});
