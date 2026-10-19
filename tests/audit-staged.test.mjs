import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';

const audit = fileURLToPath(new URL('../scripts/audit-staged.mjs', import.meta.url));
const prefix = path.join(tmpdir(), 'bb-audit-');

function checkStaged(file, content) {
  const cwd = mkdtempSync(prefix);
  try {
    execFileSync('git', ['init', '--quiet'], {cwd, stdio: 'pipe'});
    const target = path.join(cwd, file);
    mkdirSync(path.dirname(target), {recursive: true});
    writeFileSync(target, content);
    execFileSync('git', ['add', '--', file], {cwd, stdio: 'pipe'});
    return spawnSync(process.execPath, [audit], {cwd, encoding: 'utf8'});
  } finally {
    // Only remove the temporary repository created by this invocation.
    assert.ok(path.resolve(cwd).startsWith(path.resolve(prefix)));
    rmSync(cwd, {recursive: true, force: true});
  }
}

test('the staged audit accepts a clean root AGENTS.md', () => {
  const result = checkStaged('AGENTS.md', '# Project rules\nRead docs/visual-style.md before editing pages.\n');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS: 1 staged files/);
});

for (const file of ['AGENTS.md.bak', 'other/AGENTS.md', 'AGENTS.md/child.md']) {
  test(`the root AGENTS.md allowance does not admit ${file}`, () => {
    const result = checkStaged(file, '# Unapproved path\n');
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(`NOT ALLOWED: ${file}`));
  });
}

// Synthetic values are assembled at runtime; no real credentials are fixtures.
const findings = [
  ['private key', ['-----BEGIN ', 'PRIVATE KEY-----'].join('')],
  ['GitHub token', ['gh', 'p_', 'A'.repeat(30)].join('')],
  ['provider secret', ['sk_', 'live_', 'B'.repeat(24)].join('')],
  ['AWS access key', ['AK', 'IA', 'C'.repeat(16)].join('')],
  ['JWT', ['ey' + 'J' + 'D'.repeat(20), 'E'.repeat(20), 'F'.repeat(20)].join('.')],
  ['literal credential', ['api', '_key = "', 'G'.repeat(24), '"'].join('')],
  ['personal Windows path', ['C:', '/Users/', 'audit-fixture/file.txt'].join('')],
];

for (const [finding, value] of findings) {
  test(`AGENTS.md still rejects ${finding} without printing the value`, () => {
    const result = checkStaged('AGENTS.md', `# Project rules\n${value}\n`);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(`REVIEW REQUIRED (${finding}): AGENTS.md`));
    assert.ok(!result.stderr.includes(value));
    assert.ok(!result.stdout.includes(value));
  });
}
