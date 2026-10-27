import { adminClient, allowedOrigin, authenticatedUser, ApiError, enforceRateLimit, errorResponse, jsonResponse, optionsResponse } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return allowedOrigin(request) ? optionsResponse(request) : new Response(null, { status: 403 });
  if (!allowedOrigin(request)) return jsonResponse(request, { error: 'Origin is not allowed.' }, 403);
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method not allowed.' }, 405);
  try {
    const { client, user } = await authenticatedUser(request);
    await enforceRateLimit(user.id, 'mono-disconnect', 10, 3600);
    const { data: link, error: readError } = await client.from('mono_account_links')
      .select('mono_account_id').eq('user_id', user.id).maybeSingle();
    if (readError) throw new ApiError('Could not read the bank connection.', 503);
    if (link?.mono_account_id) {
      const secret = Deno.env.get('MONO_SEC_KEY');
      if (!secret) throw new ApiError('The bank service is not configured. Contact the site owner.', 503);
      let response: Response;
      try {
        response = await fetch(`https://api.withmono.com/v2/accounts/${encodeURIComponent(link.mono_account_id)}/unlink`, {
          method: 'POST', signal: AbortSignal.timeout(10_000),
          headers: { accept: 'application/json', 'mono-sec-key': secret },
        });
      } catch { throw new ApiError('The bank service could not be reached. The link was not removed.', 502); }
      if (!response.ok) throw new ApiError('The bank service did not confirm disconnection. The link was not removed.', 502);
    }
    const { error } = await adminClient().from('mono_account_links').delete().eq('user_id', user.id);
    if (error) throw new ApiError('The bank link could not be removed from the app.', 503);
    return jsonResponse(request, { disconnected: true });
  } catch (error) { return errorResponse(request, error); }
});
