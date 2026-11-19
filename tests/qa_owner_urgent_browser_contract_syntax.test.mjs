import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

/** W6 static preflight ONLY. Does not claim browser acceptance was executed. */
test('W6 owner urgent Python Chromium runner parses without altering CI/auth', () => {
  const process = spawnSync('python3', [
    '-c',
    "import ast,pathlib; ast.parse(pathlib.Path('tests/qa_acceptance_owner_urgent.py').read_text(encoding='utf-8'))"
  ], { encoding: 'utf8', timeout: 10000 });
  assert.equal(process.error, undefined);
  assert.equal(process.status, 0, process.stderr?.slice(0, 1000));
});
