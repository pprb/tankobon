/**
 * The HTTP helpers of the metadata clients: a JSON or HTML GET with a timeout and French errors.
 * @module
 */

/** How the metadata clients reach the network. */
export interface HttpOptions {
  /** `fetch` implementation; tests pass a fake. */
  fetch: typeof fetch;
  /** Sent as `User-Agent`: Comic Vine rejects requests carrying a generic one. */
  userAgent: string;
  /** Per-request timeout, in milliseconds. */
  timeoutMs: number;
}

/** GETs `url`, turning network failures and timeouts into `"<source> : …"` French errors. */
async function get(url: string, options: HttpOptions, source: string, accept: string): Promise<Response> {
  try {
    return await options.fetch(url, {
      headers: { Accept: accept, 'User-Agent': options.userAgent },
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(`${source} : le service ne répond pas.`, { cause: error });
    }
    throw new Error(`${source} : impossible de joindre le service.`, { cause: error });
  }
}

/**
 * GETs `url` and parses its JSON body. Throws `"<source> : …"` (French, shown to the user as is)
 * when the service is unreachable, times out or answers an error. An error response whose JSON
 * carries a Comic Vine `status_code` is returned instead, for the caller to interpret.
 */
export async function getJson(url: string, options: HttpOptions, source: string): Promise<unknown> {
  const response = await get(url, options, source, 'application/json');

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error(`${source} : réponse illisible (HTTP ${response.status}).`, { cause: error });
  }
  if (!response.ok) {
    const record = (typeof body === 'object' && body !== null ? body : {}) as {
      status_code?: unknown;
      error?: { message?: unknown };
    };
    if (typeof record.status_code === 'number') {
      return body;
    }
    if (response.status === 429) {
      throw new Error(`${source} : quota de requêtes dépassé. Réessaie plus tard, ou renseigne une clé API dans les paramètres.`);
    }
    const message = typeof record.error?.message === 'string' ? record.error.message : `erreur HTTP ${response.status}`;
    throw new Error(`${source} : ${message}`);
  }
  return body;
}

/**
 * GETs a web page and returns its HTML. Throws `"<source> : …"` (French) when the site is
 * unreachable, times out, or answers anything but a success (a missing page is a 404).
 */
export async function getHtml(url: string, options: HttpOptions, source: string): Promise<string> {
  const response = await get(url, options, source, 'text/html');
  if (response.status === 404) {
    throw new Error(`${source} : cette page n'existe pas.`);
  }
  if (!response.ok) {
    throw new Error(`${source} : erreur HTTP ${response.status}`);
  }
  return response.text();
}
