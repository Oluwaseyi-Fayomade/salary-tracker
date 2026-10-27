import { authenticatedUser, allowedOrigin, ApiError, enforceRateLimit, errorResponse, jsonResponse, optionsResponse, readJson, readResponseJson } from '../_shared/supabase.ts';

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function guessCategory(tx: any) {
  const text = `${tx.category || ''} ${tx.narration || ''} ${tx.description || ''}`.toLowerCase();
  if (/rent|landlord|housing/.test(text)) return 'rent';
  if (/food|grocery|market|restaurant|cafe|supermarket/.test(text)) return 'food';
  if (/transport|fuel|uber|bolt|ride|taxi|bus/.test(text)) return 'transport';
  if (/electric|power|utility|ikeja|eko.?electric/.test(text)) return 'electricity';
  if (/data|internet|airtime|telecom|mtn|airtel|glo|9mobile/.test(text)) return 'data';
  if (/loan|debt|repayment|credit/.test(text)) return 'debt';
  if (/saving|piggy/.test(text)) return 'savings';
  if (/family|school|church|transfer/.test(text)) return 'family';
  return 'fun';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return allowedOrigin(request) ? optionsResponse(request) : new Response(null, { status: 403 });
  if (!allowedOrigin(request)) return jsonResponse(request, { error: 'Origin is not allowed.' }, 403);
  if (request.method !== 'POST') return jsonResponse(request, { error: 'Method not allowed.' }, 405);
  try {
    const { client, user } = await authenticatedUser(request);
    await enforceRateLimit(user.id, 'mono-transactions', 30, 3600);
    if (Deno.env.get('MONO_ENABLED') !== 'true') throw new ApiError('Bank linking is not enabled for this site.', 403);
    const { data: link, error: linkError } = await client.from('mono_account_links')
      .select('mono_account_id,status,currency,retrieved_data').eq('user_id', user.id).maybeSingle();
    if (linkError) throw new ApiError('Could not read bank-link status.', 503);
    if (!link?.mono_account_id || !['AVAILABLE', 'PARTIAL'].includes(link.status) || !Array.isArray(link.retrieved_data) || !link.retrieved_data.includes('transactions')) {
      throw new ApiError('Your account is still connecting or transaction data is unavailable.', 409);
    }
    if (link.currency && link.currency !== 'NGN') throw new ApiError('This account is not denominated in Naira. Use CSV import for other currencies.', 400);
    const body = await readJson(request, 4096), start = body?.start, end = body?.end;
    if (!validDate(start) || !validDate(end) || start > end) throw new ApiError('A valid date range is required.', 400);
    const rangeDays = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000;
    if (rangeDays > 90) throw new ApiError('Choose a date range of 90 days or less.', 400);
    const secret = Deno.env.get('MONO_SEC_KEY');
    if (!secret) throw new ApiError('Bank linking has not been configured by the site owner.', 503);
    const url = new URL(`https://api.withmono.com/v2/accounts/${encodeURIComponent(link.mono_account_id)}/transactions`);
    url.searchParams.set('start', start); url.searchParams.set('end', end); url.searchParams.set('paginate', 'false');
    let response: Response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json', 'mono-sec-key': secret } }); }
    catch { throw new ApiError('The bank service could not be reached. Try again later.', 502); }
    if (!response.ok) throw new ApiError('The bank service could not retrieve transactions.', 502);
    const result = await readResponseJson(response), list = Array.isArray(result?.data) ? result.data : [];
    if (list.length > 2_000) throw new ApiError('The bank service returned too many transactions. Narrow the date range and try again.', 502);
    const transactions = list.filter((tx: any) => {
      const minorUnits = Number(tx?.amount);
      return String(tx?.type || '').toLowerCase() === 'debit' && Number.isSafeInteger(minorUnits) && minorUnits > 0 && minorUnits <= 100_000_000_000;
    }).map((tx: any) => ({
      externalId: String(tx.id || '').slice(0, 160), amount: Math.round(Number(tx.amount) / 100),
      date: String(tx.date || '').slice(0, 10), note: String(tx.narration || tx.description || 'Bank transaction').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120), category: guessCategory(tx),
    })).filter((tx: any) => tx.amount > 0 && tx.amount <= 1_000_000_000 && validDate(tx.date));
    return jsonResponse(request, { transactions });
  } catch (error) { return errorResponse(request, error); }
});
