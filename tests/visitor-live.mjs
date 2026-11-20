import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = mkdtempSync(join(tmpdir(), 'societyos-visitor-live-tests-'));
const root = process.cwd();
function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, NODE_PATH: [join(root, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter) } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Visitor live test command failed with exit ${result.status}`);
}
try {
  run(process.execPath, ['node_modules/typescript/bin/tsc', 'lib/live/visitor-live.test.ts', 'lib/live/visitor-store-session.test.ts', '--outDir', output, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--esModuleInterop', '--jsx', 'react-jsx']);
  run(process.execPath, [join(output, 'lib/live/visitor-live.test.js')]);
  run(process.execPath, [join(output, 'lib/live/visitor-store-session.test.js')]);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Visitor live tests failed');
  process.exitCode = 1;
} finally { rmSync(output, { recursive: true, force: true }); }
