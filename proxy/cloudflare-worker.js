/* SimulaBorsa — proxy CORS personale (gratuito) su Cloudflare Workers
   1. Vai su https://dash.cloudflare.com → Workers & Pages → Crea → Worker
   2. Incolla questo codice e premi "Deploy"
   3. Copia l'indirizzo (es. https://simulaborsa.tuonome.workers.dev)
   4. In SimulaBorsa → Impostazioni → Proxy personale scrivi:
      https://simulaborsa.tuonome.workers.dev/?url=
   Il proxy accetta solo i siti di dati finanziari elencati qui sotto. */
const CONSENTITI = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const target = new URL(request.url).searchParams.get('url');
    if (!target) return new Response('Parametro url mancante', { status: 400, headers: cors });
    let u;
    try { u = new URL(target); } catch (e) { return new Response('url non valido', { status: 400, headers: cors }); }
    if (!CONSENTITI.includes(u.hostname)) return new Response('Sito non consentito', { status: 403, headers: cors });
    const res = await fetch(u.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (SimulaBorsa proxy)', 'Accept': 'application/json' },
      cf: { cacheTtl: 10, cacheEverything: true }
    });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'public, max-age=10' }
    });
  }
};
