import { adminClient, allowedOrigin, authenticatedUser, ApiError, enforceRateLimit, errorResponse, jsonResponse, optionsResponse } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return allowedOrigin(request) ? optionsResponse(request) : new Response(null, { status: 403 });
  if (!allowedOrigin(request)) return jsonResponse(request, { error: 'Origin is not allowed.' }, 403);
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method not allowed.' }, 405);
  try {
    const { user } = await authenticatedUser(request);
    await enforceRateLimit(user.id, 'delete-account', 3, 86_400);
    const admin = adminClient();
    const { data: link, error: readError } = await admin.from('mono_account_links')
      .select('mono_account_id').eq('user_id', user.id).maybeSingle();
    if (readError) throw new ApiError('Could not verify linked services. The account was not deleted.', 503);
    if (link?.mono_account_id) {
      const secret = Deno.env.get('MONO_SEC_KEY');
      if (!secret) throw new ApiError('The linked bank could not be disconnected. Contact the site owner to complete deletion.', 503);
      let response: Response;
      try {
        response = await fetch(`https://api.withmono.com/v2/accounts/${encodeURIComponent(link.mono_account_id)}/unlink`, {
          method: 'POST', signal: AbortSignal.timeout(10_000),
          headers: { accept: 'application/json', 'mono-sec-key': secret },
        });
      } catch { throw new ApiError('The bank service could not be reached. The account was not deleted.', 502); }
      if (!response.ok) throw new ApiError('The bank service did not confirm disconnection. The account was not deleted.', 502);
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw new ApiError('The account could not be deleted. Contact the site owner.', 503);
    return jsonResponse(request, { deleted: true });
  } catch (error) { return errorResponse(request, error); }
});
