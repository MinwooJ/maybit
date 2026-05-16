import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();

// Loaded in order — later files override earlier keys.
// .env is the production / VM-deployed file (systemd EnvironmentFile).
// .env.local is the local-dev override (gitignored, never deployed).
for (const filename of ['.env', '.env.local']) {
  const path = resolve(cwd, filename);
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}
