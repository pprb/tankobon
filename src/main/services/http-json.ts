/**
 * The one HTTP helper of the metadata clients: a JSON GET with a timeout and French errors.
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

/**
 * GETs `url` and parses its JSON body. Throws `"<source> : …"` (French, shown to the user as is)
 * when the service is unreachable, times out or answers an error. An error response whose JSON
 * carries a Comic Vine `status_code` is returned instead, for the caller to interpret.
 */
export async function getJson(url: string, options: HttpOptions, source: string): Promise<unknown> {
  let response: Response;
  try {
    response = await options.fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': options.userAgent },
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(`${source} : le service ne répond pas.`, { cause: error });
    }
    throw new Error(`${source} : impossible de joindre le service.`, { cause: error });
  }

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
