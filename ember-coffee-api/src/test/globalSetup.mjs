import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..', '..');

export default async function globalSetup() {
  console.log('\n[globalSetup] Seeding remote Atlas DB before tests...');
  execSync('node seed.mjs', { cwd: apiRoot, stdio: 'inherit' });
  console.log('[globalSetup] Remote seed complete.\n');
}
