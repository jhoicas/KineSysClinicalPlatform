// Shared CORS headers for Edge Functions invoked from the browser.
// Keep allow-list aligned with headers supabase-js may send.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, prefer, accept, accept-profile, content-profile, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function optionsResponse(): Response {
  return new Response('ok', { status: 200, headers: corsHeaders });
}
