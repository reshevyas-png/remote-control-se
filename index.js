require('dotenv').config();
const { exec, spawn } = require('child_process');
const { Bot } = require('grammy');

// --- Config ---
const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_IDS  = (process.env.AUTHORIZED_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const WORKING_DIR  = process.env.WORKING_DIR;
const DRIVER       = process.env.AI_DRIVER || 'claude';
const TIMEOUT_MS   = parseInt(process.env.COMMAND_TIMEOUT_MS) || 60000;
const TELEGRAM_MAX = 4096;
const START_TIME   = Date.now();
const EXEC_ENV     = {
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.HOME}/.npm-global/bin:${process.env.PATH || ''}`,
  NO_COLOR: '1',
  TERM: 'dumb',
};

if (!BOT_TOKEN)   throw new Error('TELEGRAM_BOT_TOKEN is required');
if (!WORKING_DIR) throw new Error('WORKING_DIR is required');
if (ALLOWED_IDS.length === 0) throw new Error('AUTHORIZED_TELEGRAM_IDS is required');

// --- Drivers ---
function sanitize(prompt) {
  return prompt
    .replace(/"/g, '\\"')
    .replace(/`|\$\(|\$\{|&&|\|\||;|\||>|</g, '')
    .trim();
}

const DRIVER_BINS = {
  claude: ['/opt/homebrew/bin/claude', ['--dangerously-skip-permissions', '-p']],
  aider:  ['aider', ['--yes', '--no-auto-commits', '--message']],
};

// --- Output helpers ---
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function chunks(text, size) {
  const parts = [];
  for (let i = 0; i < text.length; i += size) {
    parts.push(text.slice(i, i + size));
  }
  return parts;
}

// --- Special commands ---
function handleSpecial(cmd) {
  const c = cmd.toLowerCase().trim();

  if (c === 'help' || c === 'start') {
    return [
      `Commands:`,
      `  help   — this message`,
      `  status — show current config`,
      `  dir    — list files in working dir`,
      `  <anything else> — sent to ${DRIVER}`,
    ].join('\n');
  }

  if (c === 'status') {
    const uptime = Math.floor((Date.now() - START_TIME) / 1000);
    return `Driver: ${DRIVER}\nDir: ${WORKING_DIR}\nUptime: ${uptime}s`;
  }

  if (c === 'dir') return null;

  return null;
}

// --- Run driver via spawn (no shell, no quoting issues) ---
function runDriver(prompt) {
  return new Promise((resolve, reject) => {
    const entry = DRIVER_BINS[DRIVER];
    if (!entry) return reject(new Error(`Unknown driver: ${DRIVER}`));

    const [bin, baseArgs] = entry;
    const proc = spawn(bin, [...baseArgs, sanitize(prompt)], {
      cwd: WORKING_DIR,
      env: EXEC_ENV,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);

    const timer = setTimeout(() => { proc.kill('SIGTERM'); reject(new Error('timeout')); }, TIMEOUT_MS);

    proc.on('exit', (code) => {
      clearTimeout(timer);
      proc.stdout.destroy();
      proc.stderr.destroy();
      console.log(`[exit code] ${code}`);
      const raw = stripAnsi(out || err).trim();
      if (code !== 0) reject(new Error(raw || `exit code ${code}`));
      else resolve(raw);
    });

    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

// --- Core handler ---
async function handleCommand(text, reply) {
  const trimmed = text.trim().replace(/^\//, '');
  if (!trimmed) return;

  if (!sanitize(trimmed)) {
    await reply('❌ Empty or invalid command after sanitization.');
    return;
  }

  const special = handleSpecial(trimmed);
  if (special !== null) {
    await reply(special);
    return;
  }

  if (trimmed.toLowerCase() === 'dir') {
    exec(`ls "${WORKING_DIR}"`, { timeout: 5000, env: EXEC_ENV }, async (err, stdout, stderr) => {
      const out = stripAnsi(err ? stderr || err.message : stdout).trim();
      await reply(out || '(empty directory)');
    });
    return;
  }

  console.log(`[command received] driver=${DRIVER}`);
  await reply('⏳ Working...');

  try {
    const raw = await runDriver(trimmed);
    const out = raw || '✅ Done — no output returned.';
    const parts = chunks(out, TELEGRAM_MAX - 2);
    for (let i = 0; i < parts.length; i++) {
      await reply(i === 0 ? '✅ ' + parts[i] : parts[i]);
    }
  } catch (e) {
    const msg = e.message || 'unknown error';
    const parts = chunks(msg, TELEGRAM_MAX - 4);
    for (let i = 0; i < parts.length; i++) {
      await reply(i === 0 ? '❌ ' + parts[i] : parts[i]);
    }
  }
}

// --- Telegram setup ---
const bot = new Bot(BOT_TOKEN);

bot.on('message', async (ctx) => {
  const userId = String(ctx.from.id);

  if (!ALLOWED_IDS.includes(userId)) {
    console.log(`[unauthorized] userId=${userId}`);
    return;
  }

  const text = ctx.message.text || '';
  const reply = (content) => ctx.reply(content);

  try {
    await handleCommand(text, reply);
  } catch (e) {
    console.error('[error]', e.message);
    await ctx.reply(`❌ Internal error: ${e.message}`);
  }
});

bot.catch((err) => console.error('[polling error]', err.message));

bot.start();
console.log(`Whadev running — driver=${DRIVER} dir=${WORKING_DIR}`);
