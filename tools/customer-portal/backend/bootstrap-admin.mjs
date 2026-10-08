// Creates a private one-time SQL file; no public bootstrap endpoint or default admin.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID, webcrypto } from 'node:crypto';
import readline from 'node:readline';
import { hashPassword } from './worker.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
function option(name) { const i = process.argv.indexOf(name); return i === -1 ? '' : process.argv[i + 1] || ''; }
const email = option('--email').trim().toLowerCase();
const name = option('--name').trim();
const output = option('--output');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || !output) {
  console.error('Usage: node bootstrap-admin.mjs --email deine@email.at --name "Emina" --output "../.private/admin-bootstrap.sql"');
  process.exit(1);
}
const outputPath = resolve(output);
// Do not accidentally put the private bootstrap file into public frontend assets.
if (/[\\/](?:dist|dist-pages|portal|galerie|public|assets|frontend)(?:[\\/]|$)/i.test(outputPath)) {
  console.error('Die SQL-Datei muss außerhalb des öffentlichen Portal-Ordners gespeichert werden.'); process.exit(1);
}
async function hidden(prompt) {
  if (!process.stdin.isTTY) throw new Error('Ein interaktives Terminal ist erforderlich. Geheimnisse nicht als Kommandozeilenargument übergeben.');
  process.stdout.write(prompt);
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((accept, reject) => {
    let value = '';
    const done = () => { process.stdin.removeListener('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    function onKey(character, key) {
      if (key?.ctrl && key.name === 'c') { done(); reject(new Error('Abgebrochen')); }
      else if (key?.name === 'return' || key?.name === 'enter') { done(); accept(value); }
      else if (key?.name === 'backspace') value = value.slice(0, -1);
      else if (character && !key?.ctrl && !key?.meta && !/[\x00-\x1f\x7f]/.test(character)) value += character;
    }
    process.stdin.on('keypress', onKey);
  });
}
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
try {
  const pepper = process.env.PASSWORD_PEPPER || await hidden('Server-Pepper (derselbe wie beim Worker, mindestens 32 Zeichen): ');
  if (pepper.length < 32) throw new Error('Der Server-Pepper muss mindestens 32 Zeichen haben.');
  const password = await hidden('Eigenes Admin-Passwort (mindestens 12 Zeichen): ');
  const repeat = await hidden('Admin-Passwort wiederholen: ');
  if (password.length < 12 || password.length > 256 || password !== repeat) throw new Error('Passwörter stimmen nicht überein oder sind zu kurz.');
  const digest = await hashPassword(password, pepper);
  const sql = `-- Private one-time admin bootstrap. Delete after successful import.\nINSERT INTO users(id,email,name,password_hash,role,created_at) VALUES(${quote(randomUUID())},${quote(email)},${quote(name)},${quote(digest)},'admin',${Date.now()});\n`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, sql, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log('Private Admin-SQL-Datei erstellt. Nach D1-Import löschen; nicht in Git aufnehmen.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
