# Changelog

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
