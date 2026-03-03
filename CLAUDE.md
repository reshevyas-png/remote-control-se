# Remote Control SE

## Role
Open-source Claude Code remote control via Telegram. If Claude RC is iOS, this is Android. Runs on the developer's laptop. Single Node.js file. Goal: HN + Reddit validation, not production scale.

```
Phone (Telegram) → node-telegram-bot-api polling → index.js → claude CLI → stdout → back to phone
```

## Boundaries

### This Agent Does:
- Receive Telegram messages from an allowlisted user ID
- Sanitize input and shell out to the configured AI driver (claude or aider)
- Chunk and return output back to Telegram
- Handle special commands: `help`, `status`, `dir`

### This Agent Does NOT:
- Store conversation history or any data
- Support multiple users or auth systems
- Support multiple working directories (WORKING_DIR is static per session)
- Use webhooks (polling only — simpler for local dev)
- Run in Docker or any cloud environment

### Never Do:
- Never commit `.env` or secrets
- Never bypass the AUTHORIZED_TELEGRAM_IDS allowlist
- Never log command content — log command type only (`"command received"`, not the prompt)
- Never store or persist output
- Never use `exec()` without `COMMAND_TIMEOUT_MS` and sanitized input
- Never add dependencies without flagging it — every dep is setup friction for Reddit users
- Keep `index.js` under 200 lines

## Tech Stack
- Language: Node.js
- Dependencies: `dotenv`, `grammy` (nothing else)
- AI Drivers: `claude` CLI or `aider` CLI (shelled out via `exec()`)

## Data Ownership
- This project owns: nothing (no database, no files written)
- Reads from: WORKING_DIR (via the AI driver)
- Writes to: nothing directly — the AI driver may write to WORKING_DIR

## Environment Variables

```bash
TELEGRAM_BOT_TOKEN=        # from @BotFather
AUTHORIZED_TELEGRAM_IDS=   # comma-separated user IDs (from @userinfobot)
WORKING_DIR=               # absolute path to project Claude Code should work in
AI_DRIVER=claude           # "claude" or "aider"
COMMAND_TIMEOUT_MS=60000   # 60 seconds default
```

## Driver Contract

Each driver takes a sanitized prompt string and returns a shell command:

```js
const DRIVERS = {
  claude: (prompt) => `claude --dangerously-skip-permissions -p "${sanitize(prompt)}"`,
  aider:  (prompt) => `aider --message "${sanitize(prompt)}" --yes --no-auto-commits`,
};
```

When adding a new driver: add to DRIVERS map, test manually in headless mode, document flags in `.env.example`.

## Input Sanitization

`sanitize()` must: escape `"`, strip backticks / `$()` / `${}` / `&&` / `||` / `;` / `|`, trim whitespace, reject if empty after sanitization.

## Output Contract

- Strip ANSI codes before sending
- Chunk at 4096 chars (Telegram limit)
- Prefix first chunk: `✅` (success) or `❌` (error)
- Empty output → `✅ Done — no output returned.`
- Never send raw stack traces — catch and summarize

## Coding Standards
- All config from `.env` — no hardcoded values
- All `exec()` calls must have `timeout` set
- Error messages go to the user via Telegram, not just the terminal
- Commits: `feat:`, `fix:`, `docs:` prefixes, small and descriptive

## Audit Checklist (run before each release)
- [ ] `index.js` is under 200 lines
- [ ] No new dependencies added without reason
- [ ] `.env` is in `.gitignore` and not committed
- [ ] All `exec()` calls have timeout set
- [ ] Allowlist check cannot be bypassed
- [ ] No command content appears in logs
- [ ] Tested with `help`, `status`, `dir`, and a real AI prompt
