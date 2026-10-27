import { adminClient, allowedOrigin, authenticatedUser, ApiError, enforceRateLimit, errorResponse, jsonResponse, optionsResponse, readJson, readResponseJson } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return allowedOrigin(request) ? optionsResponse(request) : new Response(null, { status: 403 });
  if (!allowedOrigin(request)) return jsonResponse(request, { error: 'Origin is not allowed.' }, 403);
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method not allowed.' }, 405);
  try {
    const { user } = await authenticatedUser(request);
    await enforceRateLimit(user.id, 'mono-link', 1, 60);
    const input = await readJson(request, 4096);
    if (input?.consent !== true) throw new ApiError('Explicit transaction-data consent is required.', 400);
    if (Deno.env.get('MONO_ENABLED') !== 'true') throw new ApiError('Bank linking is not enabled for this site.', 403);
    const appUrl = Deno.env.get('APP_URL'), secret = Deno.env.get('MONO_SEC_KEY');
    if (!appUrl || !secret) throw new ApiError('Bank linking has not been configured by the site owner.', 503);
    const redirect = new URL(appUrl);
    if (redirect.protocol !== 'https:' && !(Deno.env.get('APP_ENV') === 'development' && ['localhost', '127.0.0.1'].includes(redirect.hostname))) {
      throw new ApiError('The configured app URL must use HTTPS.', 503);
    }
    const email = String(user.email || '').trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Your account needs a valid email address for bank linking.', 400);
    const { data: existing, error: lookupError } = await adminClient().from('mono_account_links')
      .select('mono_account_id,status,updated_at').eq('user_id', user.id).maybeSingle();
    if (lookupError) throw new ApiError('Could not check the existing bank connection.', 503);
    if (existing?.mono_account_id) throw new ApiError('Disconnect your existing bank before linking another account.', 409);
    if (existing?.status === 'pending' && Date.now() - Date.parse(existing.updated_at) < 15 * 60_000) {
      throw new ApiError('A bank-link attempt is already in progress. Wait a few minutes or contact support if it remains pending.', 409);
    }

    const name = String(user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'Salary Survival user')
      .replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
    const reference = crypto.randomUUID(), admin = adminClient();
    const { error: saveError } = await admin.from('mono_account_links').upsert({
      user_id: user.id, reference, mono_account_id: null, status: 'pending', institution: null,
      currency: null, retrieved_data: [], consented_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (saveError) throw new ApiError('Could not prepare a secure bank connection.', 503);

    let response: Response;
    try {
      response = await fetch('https://api.withmono.com/v2/accounts/initiate', {
        method: 'POST', signal: AbortSignal.timeout(10_000),
        headers: { accept: 'application/json', 'content-type': 'application/json', 'mono-sec-key': secret },
        body: JSON.stringify({ customer: { name, email }, meta: { ref: reference }, scope: 'auth', redirect_url: redirect.toString() }),
      });
    } catch {
      await admin.from('mono_account_links').delete().eq('user_id', user.id).eq('reference', reference);
      throw new ApiError('The bank-link service could not be reached. Try again later.', 502);
    }
    let result: any;
    try { result = await readResponseJson(response); }
    catch (error) {
      await admin.from('mono_account_links').delete().eq('user_id', user.id).eq('reference', reference);
      throw error;
    }
    let linkUrl: URL | null = null;
    try { linkUrl = new URL(result?.data?.mono_url); } catch { /* invalid provider URL */ }
    if (!response.ok || !linkUrl || linkUrl.protocol !== 'https:' || linkUrl.hostname !== 'link.mono.co') {
      await admin.from('mono_account_links').delete().eq('user_id', user.id).eq('reference', reference);
      throw new ApiError('The bank-link service did not return a valid secure link.', 502);
    }
    return jsonResponse(request, { url: linkUrl.toString() });
  } catch (error) {
    return errorResponse(request, error);
  }
});
