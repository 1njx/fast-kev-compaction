<h1 align="center">fast-kev-compaction</h1>

<p align="center">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue"></a>
  <img alt="Claude Code 2.1.274+" src="https://img.shields.io/badge/Claude%20Code-2.1.274%2B-d97757">
  <img alt="Desktop app and CLI" src="https://img.shields.io/badge/works%20in-desktop%20app%20%2B%20CLI-444">
</p>

A fork of [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) that scores with
[Kev](https://github.com/jaredpalmer/kev), an open model you host yourself on [Modal](https://modal.com).

## Quick start

You need Claude Code 2.1.274 or newer (desktop app or CLI) and a [Modal](https://modal.com) account.

1. **Deploy Kev** to Modal: [deploy/README.md](deploy/README.md).
2. **Install the plugin:**
   ```sh
   claude plugin marketplace add 1njx/fast-kev-compaction
   claude plugin install fast-kev-compaction@fast-kev-compaction
   ```
3. **Set the options** `baseUrl`, `apiKey` and `model`, and turn on function hooks in `~/.claude/settings.json`:
   ```json
   { "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } }
   ```
4. **Restart Claude** fully, then type `/kevcompact` in a chat that has some tool calls.

Step by step with troubleshooting: [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md).
Or paste [docs/AGENT_PROMPT.md](docs/AGENT_PROMPT.md) into Claude, Codex or another coding agent and let it do the setup.

## Behavior

- `/kevcompact` wakes the server if needed and compacts with Kev. A plain `/compact` stays Claude Code's
  built-in summary, and so do subagent compactions.
- Automatic compaction is off by default. Set `compactAtPercent` (for example 60) and the plugin starts the same flow
  on its own when the context reaches that percentage, at most once every 10 minutes.
- A hook can run only about 10 seconds, so very long chats may fall back to the normal summary.
- The server sleeps 60 seconds after the last request. A cold start costs roughly $0.25 to $0.40 of GPU time, so set a
  $0 spend limit in Modal.

Options and client differences: [hooks/README.md](hooks/README.md).

## As a library

```sh
npm install fast-kev-compaction
```

```ts
import { compactMessages } from 'fast-kev-compaction';

const result = await compactMessages(transcript, { preserveRecentMessages: 4 });
console.log(result.messages, result.decisions, result.stats);
```

API and options: [docs/LIBRARY.md](docs/LIBRARY.md). How the scoring works: [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).

## Development

```sh
npm install
npm run typecheck
npm test
npm run validate:plugin
```

The unit tests use a fake model and make no network calls.

## Install with your AI agent

Paste this into Claude Code, Claude, Codex or another coding agent that can run commands on your computer. It asks
before anything that costs money or needs you to sign in, and it keeps your key secret. The plugin itself runs only
inside Claude Code; another agent can still do the setup for you.

```text
You are setting up the "fast-kev-compaction" Claude Code plugin for me, with my own Kev scoring server on Modal. The project is https://github.com/1njx/fast-kev-compaction. Read its README (Quick start) and docs/MANUAL_SETUP.md first, then do the setup step by step on my computer. Tell me briefly what you are doing before each step and check that it worked before the next one.

Rules you must follow:
- Ask me before anything that costs money, signs me in to an account, or needs a browser approval. Never create accounts, and never enter my passwords or payment details. Tell me exactly what to click and wait for me.
- Never print, log, commit or paste the endpoint API key. Generate it with a secure random generator, save it to a file only I can read (for example ~/.kev-modal-key), and pass it to commands through an environment variable or stdin.
- Show me the exact change before you edit ~/.claude/settings.json, and keep every existing setting.
- If something fails, show me the real error and what you will try next. Do not skip a step or pretend it worked.

Steps:
1. Preflight: check that Claude Code is 2.1.274 or newer (`claude --version`), Python 3.10+ and pip work, and git is installed.
2. Modal: `pip install modal==1.5.5`, then `modal setup` (I approve it in the browser). Tell me to confirm in Modal's billing settings that a payment method is on file (needed for GPU access and the $30 monthly free credit) and that the spend limit is $0, so it stops instead of billing. Wait for my confirmation.
3. Clone the repo and generate the key (`python -c "import secrets; print(secrets.token_hex(24))"`). Deploy: `KEV_API_KEY=<key> KEV_MODEL=jaredpalmer/kev-27b modal deploy deploy/kev_serve.py` (on Windows PowerShell set `$env:KEV_API_KEY` and `$env:KEV_MODEL` first). The first start downloads about 51 GB and takes about 6 minutes.
4. Verify: GET <endpoint>/v1/models returns 200 with the key and 401 without it (use `curl -L --max-time 900`).
5. Install the plugin: `claude plugin marketplace add 1njx/fast-kev-compaction`, then `claude plugin install fast-kev-compaction@fast-kev-compaction`.
6. Configure the plugin options: baseUrl = <endpoint>/v1/systemone, apiKey = the key, model = kev-latest (`claude plugin configure fast-kev-compaction@fast-kev-compaction --values-stdin`, JSON on stdin, from a file so the key stays out of shell history).
7. Add "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } to ~/.claude/settings.json (merge it, show me the diff).
8. Tell me to fully quit and reopen Claude (including the tray icon), then in a chat that has some tool calls type /kevcompact. A cold server takes 1 to 5 minutes; I should see progress messages and a result.
9. Finish with a short summary: what you installed, where the key file is, how to stop the server (`modal app stop kev`), and what it can cost.

If I use Codex or another agent that cannot run Claude Code plugins: the plugin itself only runs inside Claude Code, but you can still do every step above for me.
```

## Credits

- [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) by Tamara Tran
  ([@tamaratran](https://github.com/tamaratran)), MIT. The compaction library and the Claude Code hooks are theirs,
  and this fork keeps their history and license.
- [Kev](https://github.com/jaredpalmer/kev) by Jared Palmer. `deploy/kev_serve.py` is copied from it with a shorter
  idle timeout.
- Kev support, `/kevcompact`, the progress messages and CLI support by [@1njx](https://github.com/1njx).

Released under the [MIT license](LICENSE).
