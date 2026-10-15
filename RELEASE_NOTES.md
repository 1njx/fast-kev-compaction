## 0.6.0: Kev only

This fork now does one thing: score Claude Code compaction with **your own Kev model** on Modal's free tier. Your messages stay word for word; only stale tool calls and outputs are dropped. Use `/kevcompact` in the desktop app or the CLI.

### Breaking changes
- Everything TypeSafe/Jev is gone from the code and docs. There is no default endpoint: set `baseUrl` to your Kev endpoint.
- Renamed to **fast-kev-compaction**: install with `claude plugin install fast-kev-compaction@fast-kev-compaction`.
- Library exports are `Kev*` (`KevClient`, `KevAsker`, `buildKevRequest`, ...), the default model is `kev-latest`, and the key comes from the `apiKey` option or `KEV_API_KEY`.
- Removed the macOS animated demo.

### Upgrading from 0.5.x
Uninstall `fast-jev-compaction`, install `fast-kev-compaction`, and enter your `baseUrl`, `apiKey` and `model` again.

### Setup
[Manual setup](https://github.com/1njx/fast-kev-compaction/blob/main/docs/MANUAL_SETUP.md), or paste [docs/AGENT_PROMPT.md](https://github.com/1njx/fast-kev-compaction/blob/main/docs/AGENT_PROMPT.md) into your own AI agent.

### Notes
- Function hooks are an early-access Claude Code feature: set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` and restart.
- A cold GPU takes 1 to 5 minutes to wake; each cold start costs roughly $0.25 to $0.40 of GPU time. Set a $0 spend limit in Modal.

Credit: a fork of [tamaratran/fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) by Tamara Tran (MIT). The compaction library and hooks are theirs; Kev is [jaredpalmer/kev](https://github.com/jaredpalmer/kev).
