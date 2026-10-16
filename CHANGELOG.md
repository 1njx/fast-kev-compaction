# Changelog

## 0.6.4

- The long per-call "decisions" lines are no longer printed into the chat (a 948-message session printed pages of
  them). Turn them back on with the `logDecisions` option.
- The task goal Kev sees is now built from your last real prompts. Slash commands such as `/kevcompact` and the
  `<local-command...>` / `<system-reminder>` wrappers were counted as prompts, so in a session that had just run
  `/kevcompact` the goal could be junk and Kev could judge everything irrelevant.
- The start message says "Progress messages follow" instead of "Watch the toasts" (the desktop app shows them as chat
  lines).

## 0.6.3

- Fix: a very long session no longer fails with "history too large for Kev". When even the shortened history does not
  fit the state budget, the oldest calls are taken out of the state and are not scored: they stay exactly as they are,
  and everything newer is scored as before. The result says how many old calls were left alone. Run `/kevcompact` again
  and, because the history is now shorter, more of the old part fits. Tested on a 3,003-message conversation (1,500
  tool calls) against a live server: 24 requests, no timeouts, 61% smaller.
- Requests now go out one at a time by default (`requestConcurrency` 1). The total time is about the same because the
  GPU answers one at a time anyway, and the slowest request drops from 23 s to 16 s, further from Claude Code's 30-second
  limit.

## 0.6.2

- Fix: long conversations now work. A big history needs many scoring requests; they were all sent at once, queued
  on the GPU and hit Claude Code's 30-second per-request limit, so Kev fell back to the normal summary. Requests now
  go out two at a time (`requestConcurrency`) and a timed-out request is retried (`requestRetries`). Tested on a
  883-message conversation against a live server: it finished in about a minute with no timeouts, where sending all
  requests at once failed.
- Automatic compaction is off by default (`compactAtPercent` 0). Before, long sessions started a Kev compaction and a
  visible `/compact` on their own once the context passed 60%. Set `compactAtPercent` to turn it back on; its toasts
  say they are automatic and show the context percentage.

## 0.6.0 (Kev only)

- **Breaking:** this fork now supports Kev only. The package and plugin are renamed to `fast-kev-compaction`
  (`claude plugin install fast-kev-compaction@fast-kev-compaction`), the library exports are `Kev*` instead of
  `Jev*`, the default model is `kev-latest`, the key comes from the `apiKey` option or `KEV_API_KEY`, and `baseUrl`
  is required. There is no TypeSafe default endpoint any more.
- Removed the macOS animated demo.
- Migrating from 0.5.x: uninstall `fast-jev-compaction`, install `fast-kev-compaction`, and enter the same
  `baseUrl`, `apiKey` and `model` again.

## 0.5.0

- `/kevcompact` also works in the interactive Claude Code CLI: it calls `$.session.compact()` there and falls
  back to the built-in `/compact` in the desktop app and headless sessions.
- Docs: a copy-paste prompt for your own AI agent (`docs/AGENT_PROMPT.md`), a full manual setup guide with
  troubleshooting (`docs/MANUAL_SETUP.md`), `deploy/README.md`.

## 0.4.2

- Plain-English progress toasts (1/3 waking, 2/3 server up, 3/3 scoring) with a "still waking" note every 30 s.
- A final result toast: what was kept and dropped, time taken, or why it fell back or failed and what to check.

## 0.4.0

- Fix: the TypeSafe API key is never sent to a custom (Kev) server.
- Fix: auto-compaction at `compactAtPercent` no longer re-fires every turn (10-minute cooldown).
- Fix: a server that never wakes now reports an error instead of continuing.
- Subagent compactions stay on the built-in summary.

## 0.3.x

- Kev support: `baseUrl` option, `deploy/kev_serve.py` (Modal, 60 s idle shutdown), `model: kev-latest`.
- `/kevcompact` command. Wakes the Modal server first (a hook may run only about 10 s; a cold GPU needs minutes),
  then compacts with Kev.

## 0.2.0 and earlier

See the upstream project, [tamaratran/fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction).
