import type {
  On,
  PluginOptions,
  Register,
  SessionMessage,
  ToolResultSummary,
  ToolUseSummary,
  TurnCompleteInput,
} from 'claude-code';

import { compact, reductionRatio, resolveOptions } from '../src/compact.js';
import { buildJevRequest, DEFAULT_MODEL, parseJevResponse } from '../src/request.js';
import type {
  CompactOptions,
  CompactResult,
  JevAsker,
  Message,
  ToolResult,
  ToolUse,
} from '../src/types.js';

const HOOK_DEFAULTS = {
  compactAtPercent: 60,
  minReductionRatio: 0.25,
  model: DEFAULT_MODEL,
};

export type HookFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export type HookFetchResponse = {
  status: number;
  ok: boolean;
  text: string;
};

/** The shape of `$.http.fetch`, so the hook can be driven without an engine. */
export type HookFetch = (url: string, init?: HookFetchInit) => Promise<HookFetchResponse>;

export type HookConfig = CompactOptions & {
  apiKey?: string;
  /** Full System One URL of a Jev-compatible server (e.g. a Kev endpoint); unset means TypeSafe. */
  baseUrl?: string;
  compactAtPercent: number;
  minReductionRatio: number;
  model: string;
};

function optionNumber(options: PluginOptions, key: string, fallback: number): number {
  const value = options[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function optionString(options: PluginOptions, key: string): string | undefined {
  const value = options[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Reads the plugin's `userConfig` values; anything missing takes the defaults. */
export function resolveHookConfig(options: PluginOptions): HookConfig {
  const numbers: Partial<Omit<CompactOptions, 'goal'>> = {};
  for (const key of [
    'keepThreshold',
    'preserveRecentMessages',
    'maxStateTokens',
    'maxRequestTokens',
    'truncateHeadChars',
  ] as const) {
    const value = options[key];
    if (typeof value === 'number' && Number.isFinite(value)) numbers[key] = value;
  }
  const config: HookConfig = {
    ...numbers,
    compactAtPercent: optionNumber(options, 'compactAtPercent', HOOK_DEFAULTS.compactAtPercent),
    minReductionRatio: optionNumber(
      options,
      'minReductionRatio',
      HOOK_DEFAULTS.minReductionRatio,
    ),
    model: optionString(options, 'model') ?? HOOK_DEFAULTS.model,
  };
  const apiKey = optionString(options, 'apiKey');
  if (apiKey) config.apiKey = apiKey;
  const baseUrl = optionString(options, 'baseUrl');
  if (baseUrl) config.baseUrl = baseUrl;
  const goal = optionString(options, 'goal');
  if (goal) config.goal = goal;
  return config;
}

/** A `JevAsker` over the engine's `$.http.fetch`. */
export function jevAsker(
  fetchFn: HookFetch,
  apiKey: string,
  model: string,
  baseUrl?: string,
): JevAsker {
  return {
    async ask(state, questions) {
      const request = buildJevRequest({ apiKey, model, baseUrl }, state, questions);
      const response = await fetchFn(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      return parseJevResponse(response.status, response.ok, response.text);
    },
  };
}

function toolUseSummary(tool: ToolUse): ToolUseSummary {
  const summary: ToolUseSummary = {
    tool_use_id: tool.tool_use_id,
    tool: tool.tool,
    input: tool.input,
  };
  if (tool.text !== undefined) summary.text = tool.text;
  if (tool.isError) summary.isError = true;
  return summary;
}

function toolResultSummary(result: ToolResult): ToolResultSummary {
  return {
    tool_use_id: result.tool_use_id,
    text: result.text,
    isError: result.isError ?? false,
  };
}

/**
 * Maps the library's output back onto session messages. Whatever came back
 * unchanged (a message, a tool use, a tool result) is the engine's own object,
 * handle included; anything rebuilt is a fresh message without a handle, so the
 * engine takes the edited content instead of its original.
 */
export function toSessionMessages(
  input: readonly SessionMessage[],
  output: readonly Message[],
): SessionMessage[] {
  const messages = new Map<Message, SessionMessage>();
  const uses = new Map<ToolUse, ToolUseSummary>();
  const results = new Map<ToolResult, ToolResultSummary>();
  for (const message of input) {
    messages.set(message, message);
    for (const tool of message.toolUses) uses.set(tool, tool);
    for (const result of message.toolResults ?? []) results.set(result, result);
  }
  return output.map((message) => {
    const own = messages.get(message);
    if (own) return own;
    const rebuilt: SessionMessage = {
      role: message.role,
      text: message.text,
      toolUses: message.toolUses.map((tool) => uses.get(tool) ?? toolUseSummary(tool)),
    };
    if (message.toolResults && message.toolResults.length > 0) {
      rebuilt.toolResults = message.toolResults.map(
        (result) => results.get(result) ?? toolResultSummary(result),
      );
    }
    return rebuilt;
  });
}

export type SessionCompaction = {
  result: CompactResult;
  messages: SessionMessage[];
};

/** Runs the library over a session transcript; throws when the key is missing or Jev fails. */
export async function compactSession(
  messages: readonly SessionMessage[],
  config: HookConfig,
  fetchFn: HookFetch,
): Promise<SessionCompaction> {
  if (!config.apiKey) throw new Error('no API key: set the apiKey plugin option (or TYPESAFE_API_KEY / KEV_API_KEY)');
  const result = await compact(
    messages,
    jevAsker(fetchFn, config.apiKey, config.model, config.baseUrl),
    config,
  );
  return { result, messages: toSessionMessages(messages, result.messages) };
}

// The hook tsconfig has no DOM or Node typings; the hook runtime has setTimeout.
declare const setTimeout: (callback: () => void, ms: number) => unknown;

/**
 * Waits for a scale-to-zero server (Kev on Modal) to wake: GET /v1/models until it answers.
 * A cold GPU takes 2-6 minutes, longer than one request lives, so each try can fail and the next one lands on the warming container.
 * shortcut: 6 tries of up to ~150 s each, then give up with an error.
 */
export async function warmUp(
  fetchFn: HookFetch,
  config: HookConfig,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onTry?: (attempt: number, total: number) => void,
): Promise<void> {
  if (!config.baseUrl) return;
  const url = config.baseUrl.replace(/\/v1\/systemone\/?$/, '/v1/models');
  const total = 6;
  for (let attempt = 0; attempt < total; attempt++) {
    if (attempt > 0) onTry?.(attempt + 1, total);
    try {
      const response = await fetchFn(url, { headers: { authorization: `Bearer ${config.apiKey ?? ''}` } });
      if (response.ok) return;
      if (response.status === 401 || response.status === 403) throw new Error(`endpoint rejected the key (${response.status})`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('endpoint rejected')) throw error;
    }
    await sleep(3000);
  }
  throw new Error('the Kev server did not wake up');
}

function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function summarize(result: CompactResult): string {
  const { stats } = result;
  const parts = [
    stats.kept > 0 ? `${stats.kept} kept` : '',
    stats.resultsDropped > 0 ? `${stats.resultsDropped} results truncated` : '',
    stats.callsDropped > 0 ? `${stats.callsDropped} call_dropped` : '',
    stats.pinned > 0 ? `${stats.pinned} pinned` : '',
  ].filter(Boolean);
  return `${percent(reductionRatio(result))} reduction; ${
    parts.join(', ') || 'no tool calls'
  }; state ~${stats.stateTokens} tokens (${stats.stateStage}) in ${stats.requests} request(s)`;
}

const UI_LOG_MAX_CHARS = 4096;

export function decisionLog(result: CompactResult): string {
  return result.decisions
    .filter((d) => d.reason !== 'pinned')
    .map(
      (d) =>
        `${d.id}:${d.tool}:${d.action}/call=${d.keepCall.toFixed(2)}/result=${d.keepResult.toFixed(2)}`,
    )
    .join(' ');
}

export function decisionLogLines(
  result: CompactResult,
  maxChars: number = UI_LOG_MAX_CHARS,
): string[] {
  const entries = decisionLog(result).split(' ').filter(Boolean);
  if (entries.length === 0) return ['decisions: (none)'];
  const chunks: string[] = [];
  let current = '';
  for (const entry of entries) {
    const next = current ? `${current} ${entry}` : entry;
    if (current && next.length > maxChars - 24) {
      chunks.push(current);
      current = entry;
    } else current = next;
  }
  chunks.push(current);
  return chunks.map((chunk, index) =>
    chunks.length === 1
      ? `decisions: ${chunk}`
      : `decisions (${index + 1}/${chunks.length}): ${chunk}`,
  );
}

export async function getApiKey(
  $: {
    env: { get: (name: string) => Promise<string | undefined> };
    settings: { read: () => Promise<Readonly<Record<string, unknown>>> };
  },
  config: HookConfig,
): Promise<string | undefined> {
  if (config.apiKey) return config.apiKey;
  // A custom server (Kev) gets only its own key, never the TypeSafe one.
  if (config.baseUrl) return (await $.env.get('KEV_API_KEY')) || undefined;
  const fromEnv = await $.env.get('TYPESAFE_API_KEY');
  if (fromEnv) return fromEnv;
  const settings = await $.settings.read();
  const env = settings['env'];
  if (env && typeof env === 'object') {
    const value = (env as Record<string, unknown>)['TYPESAFE_API_KEY'];
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

function notify(
  $: {
    ui: {
      log: (text: string) => void;
      toast: (text: string, options?: { timeoutMs?: number }) => void;
    };
  },
  text: string,
  timeoutMs = 15_000,
): void {
  $.ui.log(text);
  $.ui.toast(text, { timeoutMs });
}

/** "52 s", "2 min 05 s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return 'under 1 s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Plain-English report for a Kev compaction that replaced the built-in summary. */
export function explainWorked(result: CompactResult, scoringMs: number): string {
  const { stats } = result;
  const freed = Math.round((stats.charsBefore - stats.charsAfter) / 4);
  const dropped = [
    stats.callsDropped > 0 ? `removed ${plural(stats.callsDropped, 'tool call')} that no longer mattered` : '',
    stats.resultsDropped > 0 ? `shortened ${plural(stats.resultsDropped, 'tool output')}` : '',
  ].filter(Boolean);
  return (
    `It worked. Kev kept ${stats.messagesAfter} of ${stats.messagesBefore} messages and made the conversation about ` +
    `${percent(reductionRatio(result))} smaller (roughly ${freed.toLocaleString('en-US')} tokens freed). ` +
    `${dropped.length > 0 ? `It ${dropped.join(' and ')}. ` : ''}` +
    `${stats.pinned > 0 ? `${plural(stats.pinned, 'message')} (your first and the newest) were left alone. ` : ''}` +
    `Nothing was summarized or reworded: everything kept is word for word. Kev scoring took ${formatDuration(scoringMs)}.`
  );
}

/** Plain-English report when Kev ran but too little could be dropped. */
export function explainTooSmall(result: CompactResult, minRatio: number): string {
  return (
    `Kev checked the conversation but found little it could safely drop (about ${percent(reductionRatio(result))} smaller; ` +
    `the plugin needs at least ${percent(minRatio)}). Claude's normal summary was used instead, so the session is still ` +
    `compacted and nothing was lost. This is normal for short chats.`
  );
}

/** Turns a raw error into a sentence that says what to check. */
export function friendlyError(message: string): string {
  if (/rejected the key|\b(401|403)\b/.test(message)) {
    return 'the Kev server rejected the API key. Check the apiKey plugin option against the key you deployed with';
  }
  if (/did not wake/.test(message)) {
    return 'the Kev server never started. The Modal app may be stopped or out of free credit: check modal.com/apps';
  }
  if (/no API key/.test(message)) return message;
  if (/\b5\d\d\b|timed? ?out|abort/i.test(message)) {
    return `the Kev server was too slow or errored (${message}). This is usually a cold start that outlasted the hook's time limit; try /kevcompact again in a minute`;
  }
  return message;
}

type Outcome = { kind: 'worked' | 'fallback' | 'error'; text: string };

let compacting = false;
// What the session.compact hook last did, so startKevCompaction can report it when the built-in /compact returns.
let outcome: Outcome | undefined;
let lastAutoAt = 0;
const AUTO_COOLDOWN_MS = 10 * 60 * 1000; // a fallback leaves the context full: do not wake the GPU again every turn
// After /kevcompact wakes the server, the next manual /compact is scored by Kev until this time (ms since epoch).
let armedUntil = 0;
const ARM_MS = 60 * 1000; // the Modal container sleeps after 60 s idle

function hookFetch($: { http: { fetch: (url: string, init?: HookFetchInit) => Promise<HookFetchResponse> } }): HookFetch {
  return async (url, init) => {
    const response = await $.http.fetch(url, init);
    return { status: response.status, ok: response.ok, text: response.text };
  };
}

type KevEngine = Parameters<typeof getApiKey>[0] &
  Parameters<typeof notify>[0] & {
    http: { fetch: (url: string, init?: HookFetchInit) => Promise<HookFetchResponse> };
    command: { run: (args: { command: string }) => Promise<unknown> };
    session: { compact: () => Promise<unknown> };
  };

/**
 * Starts the compaction. The interactive CLI allows $.session.compact() once the turn that ran /kevcompact is over (a
 * rejection inside it is retried); the desktop app's headless sessions refuse it, so there the built-in /compact is run
 * instead, and armedUntil makes that one scored by Kev.
 */
async function runCompaction($: KevEngine): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await $.session.compact();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/headless/i.test(message)) {
        await $.command.run({ command: 'compact' });
        return;
      }
      if (attempt >= 10) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/** Posts "still waking" toasts every 30 s until the returned stop function is called. */
function heartbeat($: Parameters<typeof notify>[0], startedAt: number): () => void {
  let stopped = false;
  const beat = (): void => {
    setTimeout(() => {
      if (stopped) return;
      notify(
        $,
        `Kev compaction 1/3: still waking the Kev server (${formatDuration(Date.now() - startedAt)} so far; cold starts usually take 1 to 5 minutes)`,
      );
      beat();
    }, 30_000);
  };
  beat();
  return () => {
    stopped = true;
  };
}

/**
 * Wakes the Kev server, then asks Claude Code to compact, narrating each step and reporting the result. Runs detached from
 * the hook that started it: a hook may run only about 10 s, a cold GPU needs minutes, and the host refuses
 * session.compact inside a command.run hook.
 */
async function startKevCompaction($: KevEngine, configured: HookConfig): Promise<void> {
  if (compacting) return;
  compacting = true;
  outcome = undefined;
  const started = Date.now();
  try {
    const config = { ...configured, apiKey: await getApiKey($, configured) };
    let wokeMs = 0;
    if (config.baseUrl) {
      notify(
        $,
        'Kev compaction 1/3: waking the Kev server. A cold start takes 1 to 5 minutes, a warm one a few seconds. I will post updates.',
      );
      const stopBeat = heartbeat($, started);
      try {
        await warmUp(hookFetch($), config, undefined, (attempt, total) =>
          notify($, `Kev compaction 1/3: still waiting for the server, checking again (check ${attempt} of ${total}; this is normal during a cold start)`),
        );
      } finally {
        stopBeat();
      }
      wokeMs = Date.now() - started;
    }
    armedUntil = Date.now() + ARM_MS;
    notify(
      $,
      `Kev compaction 2/3: the Kev server is up${config.baseUrl ? ` (took ${formatDuration(wokeMs)})` : ''}. Handing your conversation to Kev to score.`,
    );
    try {
      await runCompaction($);
      armedUntil = 0;
    } catch (error) {
      $.ui.log(`/compact could not run: ${error instanceof Error ? error.message : String(error)}`);
      notify(
        $,
        'The Kev server is up, but I could not start /compact for you. Type /compact within a minute and Kev will score it.',
        45_000,
      );
      return;
    }
    const total = formatDuration(Date.now() - started);
    const result = outcome as Outcome | undefined;
    if (result?.kind === 'worked') notify($, `Kev compaction finished. ${result.text} Total time ${total}.`, 60_000);
    else if (result)
      notify($, `Kev compaction finished, but Claude's normal summary did the work. ${result.text} Total time ${total}.`, 60_000);
    else
      notify(
        $,
        `Kev compaction finished after ${total}, but Kev was never asked to score anything (the conversation may have been too short to compact).`,
        45_000,
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notify(
      $,
      `Kev compaction failed after ${formatDuration(Date.now() - started)}: ${friendlyError(message)}. Your conversation was not changed. Run /compact for Claude's normal summary, or try /kevcompact again.`,
      60_000,
    );
  } finally {
    compacting = false;
  }
}

export const register: Register = (on: On, options: PluginOptions) => {
  const configured = resolveHookConfig(options);

  on('session.start', ($, event, next) =>
    $.command
      .register({ name: 'kevcompact', description: 'Compact with Kev/Jev: keep messages verbatim, drop tool output no longer needed' })
      .then(() => next(event)),
  );

  on('command.run', { command: 'kevcompact' }, async ($) => {
    if (compacting) return { text: 'a Kev compaction is already running' };
    void startKevCompaction($, configured);
    return {
      text: 'Kev compaction started. Watch the toasts: 1) waking the server (seconds if warm, 1 to 5 minutes if cold), 2) server up, 3) scoring, then a plain-English result.',
    };
  });

  on('session.compact', async ($, event, next) => {
    // shortcut: Kev scores plugin-triggered compactions and the one /compact that follows /kevcompact; other /compact runs stay built-in
    if (event.agentId) return next(event);
    const viaKev = event.trigger === 'plugin' || (event.trigger === 'manual' && Date.now() < armedUntil);
    if (event.trigger === 'manual') armedUntil = 0;
    if (!viaKev) return next(event);
    const started = Date.now();
    // With no /kevcompact flow narrating (a plugin-triggered or hand-typed /compact), this hook reports on its own.
    const alone = !compacting;
    if (!alone) notify($, `Kev compaction 3/3: scoring ${plural(event.messages.length, 'message')} (usually 1 to 10 seconds)`);
    try {
      const config = { ...configured, apiKey: await getApiKey($, configured) };
      const { result, messages } = await compactSession(event.messages, config, hookFetch($));
      for (const line of decisionLogLines(result)) $.ui.log(line);
      if (reductionRatio(result) < config.minReductionRatio) {
        outcome = { kind: 'fallback', text: explainTooSmall(result, config.minReductionRatio) };
        if (alone) notify($, `Kev compaction: ${outcome.text}`, 45_000);
        return next(event);
      }
      outcome = { kind: 'worked', text: explainWorked(result, Date.now() - started) };
      if (alone) notify($, `Kev compaction: ${outcome.text}`, 45_000);
      return { messages };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcome = {
        kind: 'error',
        text: `Kev could not score this conversation: ${friendlyError(message)}. Claude's normal summary was used instead, so the session is still compacted and nothing was lost.`,
      };
      if (alone) notify($, `Kev compaction: ${outcome.text}`, 45_000);
      return next(event);
    }
  });

  on('turn.complete', async ($, event: TurnCompleteInput, next) => {
    if (compacting || Date.now() - lastAutoAt < AUTO_COOLDOWN_MS) return next(event);
    try {
      const { context } = await $.session.usage();
      if ((context.percent ?? 0) >= configured.compactAtPercent) {
        lastAutoAt = Date.now();
        void startKevCompaction($, configured);
      }
    } catch (error) {
      $.ui.log(
        `auto-compact skipped (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    return next(event);
  });
};

export { resolveOptions };
