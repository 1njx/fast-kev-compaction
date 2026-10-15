# Changelog

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
