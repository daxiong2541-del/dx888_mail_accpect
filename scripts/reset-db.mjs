import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

if (process.env.CONFIRM_RESET_DB !== 'YES') {
  console.error('Refusing to reset DB. Set CONFIRM_RESET_DB=YES to proceed.');
  process.exit(1);
}

await mongoose.connect(uri, { bufferCommands: false });

const collections = ['users', 'emailconfigs', 'batchregistrations', 'systemsettings'];
for (const name of collections) {
  const exists = await mongoose.connection.db
    .listCollections({ name })
    .hasNext();
  if (exists) {
    await mongoose.connection.db.collection(name).deleteMany({});
    console.log(`Cleared collection: ${name}`);
  } else {
    console.log(`Skip missing collection: ${name}`);
  }
}

await mongoose.disconnect();
console.log('Done');
