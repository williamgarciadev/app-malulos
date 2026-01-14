# taskcodex

- Pending: review unexpected change in tasks/todo.md.
- Fix: cancel_order action regex in Telegram bot (was escaped).
- Fix: restore emoji strings in Telegram bot messages.
- Fix: force UTF-8 (no BOM) for Telegram bot messages.
- Fix: replace bot emojis with unicode escapes to avoid mojibake.
- Fix: replace mojibake text in Telegram bot with unicode escapes (ASCII-only).
- Fix: normalize \u escapes to single backslash for JS unicode literals.
