// Usage: node import.mjs   (Node 18+; run next to markets.json)
// Set PB_URL, PB_EMAIL, PB_PASSWORD in your environment first.
import { readFile } from 'node:fs/promises';
import 'dotenv/config';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8080';
const EMAIL = process.env.PB_EMAIL;
const PASSWORD = process.env.PB_PASSWORD;

// Superuser auth (PocketBase >= 0.23). On older versions use /api/admins/auth-with-password.
const auth = await fetch(
  `${PB_URL}/api/collections/_superusers/auth-with-password`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASSWORD }),
  },
).then((r) => r.json());

if (!auth.token) throw new Error('Auth failed: ' + JSON.stringify(auth));

const markets = JSON.parse(
  await readFile(new URL('./markets.json', import.meta.url)),
);

for (const m of markets) {
  const res = await fetch(`${PB_URL}/api/collections/markets/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth.token },
    body: JSON.stringify(m),
  });
  console.log(res.ok ? 'OK  ' : 'FAIL', m.slug, res.ok ? '' : await res.text());
}
