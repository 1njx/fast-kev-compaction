# Manual setup: Kev compaction for Claude Code

This takes about 30 minutes, most of it waiting for the first model download. You will:

1. deploy your own Kev scoring server on [Modal](https://modal.com) (it sleeps when idle),
2. install this plugin in Claude Code (desktop app or CLI),
3. point the plugin at your server,
4. run `/kevcompact`.

Prefer to hand this to an AI? Paste the prompt from [AGENT_PROMPT.md](AGENT_PROMPT.md) into Claude or Codex.

## How it works

```
/kevcompact ──► wake your Modal server (1-5 min cold) ──► Claude Code compacts
                                                          │
 Kev scores every tool call and result: "still needed?" ◄─┘
 stale calls and outputs are dropped, everything else stays word for word
```

Your messages are never summarized or reworded. A normal `/compact` is unchanged.

## Requirements

| Need | Details |
| --- | --- |
| Claude Code | 2.1.274 or newer (tested on 2.1.295), desktop app or CLI. Function hooks are an early-access feature. |
| Modal account | Free to start. GPU access and the $30/month free credit need a payment method on file. |
| Python | 3.10+ with `pip`, to run the `modal` command. |
| Disk and time | The first start downloads about 51 GB of model weights **to Modal**, not to your computer. |
| Git | Only to clone this repo for `deploy/kev_serve.py`. |

Plugins and hooks run on your machine with your permissions. Read `hooks/fast-kev.ts` if you want to see exactly what it does (it talks only to the server you configure).

## Step 1: Modal account, payment method and spend limit

1. Sign up at [modal.com](https://modal.com).
2. Add a payment method in the billing settings. Without one, deploying Kev-27B fails with *"Please add a payment method to use B200/H100 GPU functions"*.
3. **Set the workspace spend limit to $0** in Modal's billing/usage settings. Modal then stops your workloads when the free credit is used up instead of charging your card. (Storing the 51 GB model is covered by the free storage allowance.)

Typical cost: each cold start is about 3 minutes of GPU time, roughly $0.25 to $0.40 on a B200. The server shuts off 60 seconds after the last request, so you pay only while compacting.

## Step 2: Install and sign in to the Modal CLI

```sh
pip install modal==1.5.5
modal setup        # opens your browser to sign in
```

## Step 3: Get the code and make an API key

```sh
git clone https://github.com/1njx/fast-kev-compaction
cd fast-kev-compaction
python -c "import secrets; print(secrets.token_hex(24))"
```

That prints a 48-character key. This key protects your endpoint (anyone with the URL and key can use your GPU credit), so:

- store it in a file only you can read, for example `~/.kev-modal-key`,
- do not commit it, paste it in chats, or share screenshots of it,
- keep it: the plugin must be configured with the **same** key, and redeploying with a different key makes the plugin fail with a 401.

## Step 4: Deploy Kev

macOS / Linux / Git Bash:

```sh
KEV_API_KEY="$(cat ~/.kev-modal-key)" KEV_MODEL=jaredpalmer/kev-27b modal deploy deploy/kev_serve.py
```

Windows PowerShell:

```powershell
$env:KEV_API_KEY = (Get-Content $HOME\.kev-modal-key).Trim()
$env:KEV_MODEL = "jaredpalmer/kev-27b"
modal deploy deploy/kev_serve.py
```

Modal prints your endpoint: `https://<workspace>--kev-api.modal.run`.

Choosing a model: `kev-27b` is the best quality and needs a B200, H200 or H100. `kev-9b`, `kev-4b` and `kev-0.8b` use cheaper GPUs and cold-start faster, with lower quality. The GPU is chosen from the model automatically.

## Step 5: Check the server

The first request waits for the cold start (about 6 minutes the very first time, because of the download). Use `curl.exe` on Windows.

```sh
curl -L --max-time 900 https://<workspace>--kev-api.modal.run/v1/models -H "authorization: Bearer $(cat ~/.kev-modal-key)"
```

You want HTTP 200. The same request **without** the header must return 401. If you get anything else, see [Troubleshooting](#troubleshooting).

## Step 6: Install the plugin in Claude Code

```sh
claude plugin marketplace add 1njx/fast-kev-compaction
claude plugin install fast-kev-compaction@fast-kev-compaction
```

The install can prompt for the options below. The CLI and the desktop app share `~/.claude`, so a plugin installed from the CLI is available in both after a restart.

## Step 7: Set the plugin options

| Option | Value |
| --- | --- |
| `baseUrl` | `https://<workspace>--kev-api.modal.run/v1/systemone` |
| `apiKey` | the key from Step 3 (stored as a sensitive option) |
| `model` | `kev-latest` |

Easiest from a terminal: put the values in a file, feed it in, and delete the file.

```sh
cat > values.json <<'EOF'
{ "baseUrl": "https://<workspace>--kev-api.modal.run/v1/systemone", "model": "kev-latest", "apiKey": "<your key>" }
EOF
claude plugin configure fast-kev-compaction@fast-kev-compaction --values-stdin < values.json
rm values.json
```

(The values are single-line strings in one JSON object. If PowerShell's pipe is rejected, use Git Bash for this one command or answer the install prompts instead.) Run `claude plugin configure fast-kev-compaction@fast-kev-compaction` with no flags to see which options are set.

Optional tuning: `keepThreshold` (default 0.5), `preserveRecentMessages` (6), `compactAtPercent` (0, meaning automatic compaction is off), `minReductionRatio` (0.25). See [hooks/README.md](../hooks/README.md).

## Step 8: Turn on function hooks

Add this to `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`). Merge it into the existing JSON; do not replace the file.

```json
{
  "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" }
}
```

If the file already has an `"env"` object, add the line inside it. Make sure the JSON stays valid (commas!).

## Step 9: Restart and try it

1. **Fully quit** Claude (desktop app: also the tray icon) and reopen it. Hooks and plugin options load at startup only.
2. `claude plugin list` should show `fast-kev-compaction` enabled.
3. Open a chat and make Claude read a few files so there is something to compact.
4. Type `/kevcompact`. If it is missing from the slash menu, see Troubleshooting.

You should see:

1. `Kev compaction 1/3: waking the Kev server…` (then "still waking" every 30 s on a cold start)
2. `2/3: the Kev server is up (took 42 s)…`
3. `3/3: scoring 16 messages…`
4. `Kev compaction finished. It worked. Kev kept 8 of 16 messages and made the conversation about 65% smaller…`

A short chat can end with *"found little it could safely drop. Claude's normal summary was used"*. That is normal and loses nothing.

## Everyday use

- `/kevcompact` compacts with Kev. A plain `/compact` stays the built-in summary.
- At 60% context the plugin starts the same flow on its own, at most once every 10 minutes.
- Update: `claude plugin marketplace update fast-kev-compaction` then `claude plugin update fast-kev-compaction@fast-kev-compaction`, and restart.
- Stop the server: `modal app stop kev`. Redeploy with the same key to bring it back.
- Rotate the key: redeploy with a new `KEV_API_KEY`, then rerun Step 7 with the new key.
- Uninstall: `claude plugin uninstall fast-kev-compaction@fast-kev-compaction`, remove the env line if you added it only for this, and `modal app stop kev`.

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| `/kevcompact` is not in the slash menu | Fully restart Claude. Check `claude plugin list` shows it enabled, the `env` line from Step 8 is in `settings.json` and the JSON is valid, and Claude Code is 2.1.274 or newer. |
| `hooks module did not load` | Claude Code is too old or the plugin files were edited. Update both and reinstall. |
| `the Kev server rejected the API key` (401) | The `apiKey` option differs from the key you deployed with. Re-run Step 7 with the right key, or redeploy with the key you configured. |
| `the Kev server never started` | The Modal app is stopped, deleted or out of credit. Check [modal.com/apps](https://modal.com/apps) and redeploy. |
| Waits for minutes at "waking" | Normal for a cold GPU (1 to 5 minutes, the first ever start about 6). The plugin retries for up to about 15 minutes. |
| `too slow or errored` / fallback on a long chat | Scoring has to finish within about 10 seconds. Very long chats can exceed it, and Claude's normal summary is used instead. Nothing is lost; try `/kevcompact` again or a smaller `maxStateTokens`. |
| `could not start /compact for you` | Type `/compact` within a minute; Kev scores that run. |
| `Please add a payment method to use B200/H100 GPU functions` | Add a payment method in Modal (Step 1), then deploy again. |
| `$.session.compact: not available in a headless session` in logs | Expected in the desktop app; the plugin falls back to `/compact` automatically. |
| Deploy fails on GPU capacity | Try again later, or set `KEV_GPU=H100` (or another GPU) when deploying. |

## Safety notes

- The endpoint is protected only by its URL and key. Treat the key like a password.
- The plugin sends the conversation only to the `baseUrl` you set.
- Compaction sends your conversation (with tool outputs shortened) to **your** Modal server, not to a third party.
- Keep the $0 spend limit on unless you want to pay for more usage.

## Using it with Codex or another agent

The plugin runs only inside Claude Code. Another agent can still do the setup for you: give it [AGENT_PROMPT.md](AGENT_PROMPT.md).
