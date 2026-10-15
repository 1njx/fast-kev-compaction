import { buildKevRequest, parseKevResponse } from './request.js';
import type { KevAsker, KevQuestions, KevResponse, KevState } from './types.js';

export interface KevClientOptions {
  /** Defaults to `process.env.KEV_API_KEY`. */
  apiKey?: string;
  /** Defaults to `kev-latest`. */
  model?: string;
  /** Full URL of the Kev endpoint. Defaults to `process.env.KEV_BASE_URL`. */
  baseUrl?: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/** Asks Kev over HTTP with the global `fetch` (or an injected one). */
export class KevClient implements KevAsker {
  private readonly apiKey: string;
  private readonly model: string | undefined;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: KevClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.KEV_API_KEY ?? '';
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? process.env.KEV_BASE_URL ?? '';
    this.fetcher = options.fetch ?? fetch;
  }

  async ask(state: KevState, questions: KevQuestions): Promise<KevResponse> {
    if (!this.baseUrl) throw new Error('no Kev endpoint: set the baseUrl option or KEV_BASE_URL');
    if (!this.apiKey) throw new Error('KEV_API_KEY is not configured');
    const request = buildKevRequest(
      { apiKey: this.apiKey, model: this.model, baseUrl: this.baseUrl },
      state,
      questions,
    );
    const response = await this.fetcher(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    return parseKevResponse(response.status, response.ok, await response.text());
  }
}
