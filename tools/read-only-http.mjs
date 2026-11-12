// Verification must finish reading the body inside the retry boundary.
export async function fetchCompleteResponse(url, options = {}, {request = fetch, onRetry = () => {}} = {}) {
  const method = options.method ?? 'GET';
  if (!['GET','HEAD'].includes(method)) throw new Error('Verification transport is read-only');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(url, {...options, method, signal: AbortSignal.timeout(60000)});
      const bytes = await response.arrayBuffer();
      const body = method === 'HEAD' || [204,205,304].includes(response.status) ? null : bytes;
      return new Response(body, {status: response.status, statusText: response.statusText, headers: response.headers});
    } catch (error) {
      if (attempt === 2) throw error;
      onRetry({url: String(url), attempt: attempt + 1, message: error.message});
    }
  }
}
