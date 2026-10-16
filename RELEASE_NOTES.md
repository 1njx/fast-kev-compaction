## 0.6.3: very long conversations work, and automatic compaction is off

### Fixes
- **Very long conversations no longer fail.** A session with hundreds of tool calls could be too big to show Kev at once and failed with "history too large for Kev". Now the oldest calls that don't fit are left out of the scoring and stay exactly as they are, and everything newer is scored as normal. The result tells you how many old calls were left alone. Run `/kevcompact` again and more of the old part fits. Tested on a 3,003-message conversation (1,500 tool calls) against a live server: no timeouts, 61% smaller.
- **No more timeouts on big chats.** Scoring requests used to be sent all at once, queued on the GPU and hit Claude Code's 30-second per-request limit, so Kev fell back to the normal summary. They now go out one at a time and a timed-out request is retried.
- **Automatic compaction is off by default.** Before, a long session started a Kev compaction (and a visible `/compact`) on its own once the context passed 60%. It now only runs when you type `/kevcompact`. To turn it back on, set the `compactAtPercent` option (for example 60); its messages say they are automatic.
- The install prompt no longer points at a README section that doesn't exist.

### New options
- `requestConcurrency` (default 1): scoring requests in flight at once.

### Upgrading
```sh
claude plugin marketplace update fast-kev-compaction
claude plugin update fast-kev-compaction@fast-kev-compaction
```
Then fully restart Claude. Coming from 0.5.x or earlier? See the [0.6.0 notes](https://github.com/1njx/fast-kev-compaction/releases/tag/v0.6.0): the plugin was renamed to `fast-kev-compaction`.

### Notes
- Function hooks are an early-access Claude Code feature: set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` and restart.
- Tested in headless Claude Code (the mode the desktop app uses). The interactive terminal path is written but not yet tested.
- A very big session can take a few minutes to score. A cold GPU takes 1 to 5 minutes to wake; each cold start costs roughly $0.25 to $0.40 of GPU time. Set a $0 spend limit in Modal.

Setup: [manual guide](https://github.com/1njx/fast-kev-compaction/blob/main/docs/MANUAL_SETUP.md), or paste the prompt from the README into your own AI agent.

Credit: a fork of [tamaratran/fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction) by Tamara Tran (MIT). The compaction library and hooks are theirs; Kev is [jaredpalmer/kev](https://github.com/jaredpalmer/kev).
