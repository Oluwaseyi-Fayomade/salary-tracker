import { adminClient, allowedOrigin, ApiError, errorResponse, jsonResponse, optionsResponse, readJson } from '../_shared/supabase.ts';

const isUuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const safeId = (value: unknown) => typeof value === 'string' && value.length >= 4 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return allowedOrigin(request) ? optionsResponse(request) : new Response(null, { status: 403 });
  if (!allowedOrigin(request)) return jsonResponse(request, { error: 'Origin is not allowed.' }, 403);
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method not allowed.' }, 405);
  const secret = Deno.env.get('MONO_WEBHOOK_SECRET');
  if (!secret || request.headers.get('mono-webhook-secret') !== secret) return jsonResponse(request, { error: 'Unauthorized.' }, 401);
  try {
    const payload = await readJson(request, 128 * 1024), event = payload?.event, data = payload?.data;
    if (typeof event !== 'string' || event.length > 80 || !data || typeof data !== 'object' || Array.isArray(data)) throw new ApiError('Invalid webhook payload.', 400);
    const account = data.account && typeof data.account === 'object' && !Array.isArray(data.account) ? data.account : {};
    const reference = data.meta?.ref || account.meta?.ref;
    const admin = adminClient();
    if (event === 'mono.events.account_connected' || event === 'mono.events.account_updated') {
      const accountId = data.id || account._id || account.id;
      if (!isUuid(reference) || !safeId(accountId)) throw new ApiError('Invalid account-link event.', 400);
      const rawStatus = String(data.meta?.data_status || account.meta?.data_status || 'PROCESSING').toUpperCase();
      const statuses = ['AVAILABLE', 'PARTIAL', 'UNAVAILABLE', 'FAILED', 'PROCESSING'];
      const status = statuses.includes(rawStatus) ? rawStatus : 'PROCESSING';
      const rawRetrieved = data.meta?.retrieved_data || account.meta?.retrieved_data || [];
      if (!Array.isArray(rawRetrieved) || rawRetrieved.length > 40) throw new ApiError('Invalid account-link event.', 400);
      const retrievedData = rawRetrieved.filter((value: unknown): value is string => typeof value === 'string' && value.length <= 40);
      const institutionName = account.institution?.name;
      const institution = typeof institutionName === 'string' ? institutionName.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100) || null : null;
      const currency = String(account.currency || 'NGN').toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new ApiError('Invalid account-link event.', 400);
      const { error } = await admin.from('mono_account_links').update({
        mono_account_id: accountId, status, institution, currency, retrieved_data: retrievedData, updated_at: new Date().toISOString(),
      }).eq('reference', reference);
      if (error) throw new ApiError('Could not update bank-link status.', 503);
    } else if (event === 'mono.events.account_unlinked') {
      const accountId = account._id || account.id || data.account;
      if (!safeId(accountId)) throw new ApiError('Invalid account unlink event.', 400);
      const { error } = await admin.from('mono_account_links').update({
        mono_account_id: null, status: 'unlinked', retrieved_data: [], updated_at: new Date().toISOString(),
      }).eq('mono_account_id', accountId);
      if (error) throw new ApiError('Could not update bank-link status.', 503);
    }
    return jsonResponse(request, { received: true });
  } catch (error) { return errorResponse(request, error); }
});
