## 0.6.2: long conversations work, and automatic compaction is off

### Fixes
- **Long conversations now work.** A big history needs many scoring requests. They were all sent at once, queued on the GPU and hit Claude Code's 30-second per-request limit, so Kev fell back to the normal summary. Requests now go out two at a time and a timed-out request is retried. Tested on an 883-message conversation against a live server: it finished in about a minute with no timeouts, where sending everything at once failed.
- **Automatic compaction is off by default.** Before, a long session started a Kev compaction (and a visible `/compact`) on its own once the context passed 60%. It now only runs when you type `/kevcompact`. To turn it back on, set the `compactAtPercent` option (for example 60); its messages say they are automatic.
- The install prompt no longer points at a README section that doesn't exist.

### New
- `requestConcurrency` option (default 2). Set it to 1 for the safest behavior on very long chats.

### Upgrading
```sh
claude plugin marketplace update fast-kev-compaction
claude plugin update fast-kev-compaction@fast-kev-compaction
```
Then fully restart Claude. Coming from 0.5.x or earlier? See the [0.6.0 notes](https://github.com/1njx/fast-kev-compaction/releases/tag/v0.6.0): the plugin was renamed to `fast-kev-compaction`.

### Notes
- Function hooks are an early-access Claude Code feature: set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` and restart.
- Tested in headless Claude Code (the mode the desktop app uses). The interactive terminal path is written but not yet tested.
- A cold GPU takes 1 to 5 minutes to wake; each cold start costs roughly $0.25 to $0.40 of GPU time. Set a $0 spend limit in Modal.

Setup: [manual guide](https://github.com/1njx/fast-kev-compaction/blob/main/docs/MANUAL_SETUP.md), or paste the prompt from the README into your own AI agent.

Credit: a fork of [tamaratran/fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) by Tamara Tran (MIT). The compaction library and hooks are theirs; Kev is [jaredpalmer/kev](https://github.com/jaredpalmer/kev).
