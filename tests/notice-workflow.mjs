import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
const output = mkdtempSync(join(tmpdir(), 'societyos-notices-tests-'));
function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, NODE_PATH: [join(process.cwd(), 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter) } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Notice workflow check failed: exit ${result.status}`);
}
try {
  run(['node_modules/typescript/bin/tsc', 'lib/notices/notices.test.tsx', 'lib/firebase/resident-push.test.ts', '--outDir', output, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--esModuleInterop', '--jsx', 'react-jsx', '--allowJs']);
  run([join(output, 'lib/notices/notices.test.js')]);
  run([join(output, 'lib/firebase/resident-push.test.js')]);
} catch (error) { console.error(error instanceof Error ? error.message : 'Notice tests failed'); process.exitCode = 1; }
finally { rmSync(output, { recursive: true, force: true }); }
