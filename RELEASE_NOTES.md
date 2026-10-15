## fast-jev-compaction 0.5.0: Kev support and `/kevcompact`

Run the context-compaction scoring on **your own open model** ([Kev](https://github.com/jaredpalmer/kev), hosted on Modal's free tier) instead of TypeSafe's hosted Jev. Your messages stay word for word; only stale tool calls and outputs are dropped.

### What's new
- **`/kevcompact`**: wakes your Kev server, compacts the conversation, and tells you in plain English what happened.
- **Works in the Claude desktop app and the Claude Code CLI.**
- **Readable progress**: 1/3 waking the server (with a "still waking" note every 30 s), 2/3 server up, 3/3 scoring.
- **A clear result**: how many messages were kept, how much smaller the chat got, what was dropped and how long it took. If it fell back or failed, it says why and what to check, and your conversation is never left half-changed.
- **`baseUrl` option** to point the plugin at any Jev-compatible server, plus `deploy/kev_serve.py` (Kev on Modal, idles off after 60 s).

### Fixes
- The TypeSafe API key is never sent to a custom (Kev) server.
- Auto-compaction at `compactAtPercent` no longer re-fires every turn (10-minute cooldown).
- A server that never wakes now reports an error instead of carrying on.
- Subagent compactions stay on Claude Code's built-in summary.

### Setup
See [Use Kev instead of Jev](README.md#use-kev-instead-of-jev) and [deploy/README.md](deploy/README.md).

### Notes
- Function hooks are an early-access Claude Code feature: set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` and restart.
- A cold GPU takes 1 to 5 minutes to wake; each cold start costs roughly $0.35 of B200 time. Set a $0 spend limit in Modal.
- The interactive CLI path is written but was tested only in headless (`claude -p`) mode, which is what the desktop app uses.

Credit: this is a fork of [tamaratran/fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) by Tamara Tran (MIT). The compaction library and hooks are theirs; Kev is [jaredpalmer/kev](https://github.com/jaredpalmer/kev). Full credits are in the README.
