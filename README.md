# Remote Control SE

Claude Code remote control via Telegram. 1 file. 175 lines. $0.

If Claude RC is iOS, this is Android. Open, free, yours.

```
Phone (Telegram)  -->  Remote Control SE (Node.js)  -->  Claude Code CLI
                                                              |
                                                        Your project dir
                                                              |
                                                        Result back to phone
```

## Why This Exists

Claude Remote Control broke. Instead of debugging someone else's tool, I built my own in 175 lines.

Send prompts to Claude Code from your phone. Fix bugs from the couch. Deploy from the grocery store. Review code from bed.

It's a Telegram bot that shells out to `claude` CLI in your project directory and sends the result back. That's it.

## Setup (5 minutes)

### 1. Create a Telegram bot
- Message [@BotFather](https://t.me/botfather) on Telegram
- Send `/newbot`, follow the prompts
- Copy the bot token

### 2. Get your Telegram user ID
- Message [@userinfobot](https://t.me/userinfobot)
- Copy the `Id` number

### 3. Install and run

```bash
git clone https://github.com/reshevyas-png/remote-control-se.git
cd remote-control-se
npm install
cp .env.example .env
# Fill in your bot token, user ID, and project path
node index.js
```

### 4. Use it

Message your bot on Telegram:

```
> fix the login bug in auth.ts
> add input validation to the signup form
> what does the handlePayment function do?
> dir
```

Done. That's the whole setup.

## How It Works

1. You send a message to your Telegram bot
2. Remote Control SE checks your user ID against the allowlist
3. Sanitizes the input (strips shell injection characters)
4. Spawns `claude -p "your prompt"` in your project directory
5. Sends the output back to Telegram (chunked at 4096 chars)

No server. No database. No API keys beyond what you already have. Runs on your laptop.

## Commands

| Command | What it does |
|---------|-------------|
| `help` | List commands |
| `status` | Show driver, working directory, uptime |
| `dir` | List files in your project |
| anything else | Sent to Claude Code (or Aider) |

## Works with Aider Too

Change one line in `.env`:

```bash
AI_DRIVER=aider    # instead of "claude"
```

Remote Control SE will use `aider --yes --no-auto-commits --message "your prompt"` instead.

## Requirements

- Node.js 18+
- `claude` CLI installed: `npm install -g @anthropic-ai/claude-code`
- A Telegram account

## Remote Control SE vs Claude RC

| | Remote Control SE | Claude RC |
|---|---|---|
| Cost | $0 | Paid |
| Open source | Yes (MIT) | No |
| Dependencies | 2 | Unknown |
| Lines of code | 175 | Unknown |
| Works with Aider | Yes | No |
| You own it | Yes | No |

## What This Isn't

- Not a hosted service — runs on your machine
- Not a conversation system — no memory between messages
- Not multi-project — one `WORKING_DIR` per session
- Not production infrastructure — this is a weekend build that works

## Security

- **Allowlist-only**: Only your Telegram user ID can execute commands
- **Input sanitization**: Strips backticks, `$()`, `${}`, `&&`, `||`, `;`, `|`, `>`
- **Timeout enforcement**: Every command has a configurable timeout (default 60s)
- **No logging of prompts**: Command type is logged, not content
- **No data storage**: Nothing is persisted — respond and discard

## License

[MIT](LICENSE)

---

Built because my remote control broke and I needed a new one. Took a few hours. Still works.
