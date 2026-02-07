const DEFAULT_BASE_URL = 'https://mail.dynmsl.com/api/public';

function getUpstreamBaseUrl() {
  return process.env.DYNMSL_API_BASE_URL || DEFAULT_BASE_URL;
}

function buildUpstreamUrl(req: Request, pathSegments: string[]) {
  const incomingUrl = new URL(req.url);
  const encodedPath = pathSegments.map((seg) => encodeURIComponent(seg)).join('/');
  const baseUrl = getUpstreamBaseUrl().replace(/\/+$/, '');
  const upstreamUrl = new URL(`${baseUrl}/${encodedPath}`);
  upstreamUrl.search = incomingUrl.search;
  return upstreamUrl;
}

function stripHopByHopHeaders(headers: Headers) {
  const hopByHop = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'host',
    'content-length',
  ];
  for (const key of hopByHop) headers.delete(key);
}

async function proxy(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstreamUrl = buildUpstreamUrl(req, path || []);

  const headers = new Headers(req.headers);
  stripHopByHopHeaders(headers);

  const wafBypassToken = process.env.DYNMSL_WAF_BYPASS_TOKEN;
  if (wafBypassToken && !headers.has('X-DYNMSL-WAF-BYPASS')) {
    headers.set('X-DYNMSL-WAF-BYPASS', wafBypassToken);
  }

  if (!headers.has('Authorization')) {
    const apiToken = process.env.DYNMSL_API_TOKEN;
    if (apiToken) {
      headers.set('Authorization', apiToken);
    }
  }

  const method = req.method.toUpperCase();
  const body =
    method === 'GET' || method === 'HEAD' || method === 'OPTIONS' ? undefined : await req.arrayBuffer();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-DYNMSL-WAF-BYPASS',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const upstreamRes = await fetch(upstreamUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  const resHeaders = new Headers(upstreamRes.headers);
  stripHopByHopHeaders(resHeaders);
  resHeaders.set('Cache-Control', 'no-store');

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  });
}

export const runtime = 'edge';

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function OPTIONS(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
