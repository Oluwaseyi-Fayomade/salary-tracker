import { allowedOrigin, corsHeaders, errorResponse, jsonResponse, optionsResponse } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return allowedOrigin(request) ? optionsResponse(request) : new Response(null, { status: 403 });
  if (!allowedOrigin(request)) return jsonResponse(request, { error: 'Origin is not allowed.' }, 403);
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method not allowed.' }, 405);
  try {
    const enabled = Deno.env.get('MONO_ENABLED') === 'true'
      && Boolean(Deno.env.get('MONO_SEC_KEY'))
      && Boolean(Deno.env.get('APP_URL'));
    return jsonResponse(request, { enabled });
  } catch (error) {
    return errorResponse(request, error);
  }
});
