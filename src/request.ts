import type { KevAnswer, KevQuestions, KevResponse, KevState } from './types.js';

export const DEFAULT_MODEL = 'kev-latest';

export interface KevRequest {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

/** The HTTP request for one Kev call, for any fetch-like transport. */
export function buildKevRequest(
  params: {
    apiKey: string;
    model?: string;
    /** Full URL of the Kev endpoint, e.g. https://<workspace>--kev-api.modal.run/v1/systemone. */
    baseUrl: string;
  },
  state: KevState,
  questions: KevQuestions,
): KevRequest {
  return {
    url: params.baseUrl,
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model ?? DEFAULT_MODEL,
      state,
      questions,
    }),
  };
}

/** Validates a Kev response body; throws on anything but an `answers` object. */
export function parseKevResponse(
  status: number,
  ok: boolean,
  text: string,
): KevResponse {
  if (!ok) {
    throw new Error(`Kev request failed (${status}): ${text.slice(0, 200)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Kev returned malformed JSON');
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    !('answers' in parsed) ||
    parsed.answers === null ||
    typeof parsed.answers !== 'object'
  ) {
    throw new Error('Kev response is missing answers');
  }
  return parsed as KevResponse;
}

/** The `noul` probability of one answer; throws when it is not there. */
export function noulAnswer(
  answers: Record<string, KevAnswer>,
  name: string,
): number {
  const answer = answers[name];
  if (
    !answer ||
    !('noul' in answer) ||
    typeof answer.noul !== 'number' ||
    !Number.isFinite(answer.noul)
  ) {
    throw new Error(`Invalid Kev answer for ${name}`);
  }
  return answer.noul;
}
