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
