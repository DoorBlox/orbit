import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Only genuine Markdown-only PRs may bypass expensive checks.
export function isDocumentationOnly(paths) {
  return Array.isArray(paths) && paths.length > 0 && paths.every(path =>
    typeof path === 'string' && path.length > 0 && !path.includes('\0') && /\.mdx?$/.test(path));
}

export function chooseCheckScope({eventName, changedPaths, knownBase} = {}) {
  if (eventName !== 'pull_request' || knownBase !== true || !isDocumentationOnly(changedPaths)) {
    return 'full';
  }
  return 'docs';
}

function git(args, options = {}) {
  return execFileSync('git', args, {encoding:'utf8', maxBuffer:4 * 1024 * 1024, ...options});
}

export function runScopeClassifier({eventName = process.env.GITHUB_EVENT_NAME,
  outputPath = process.env.GITHUB_OUTPUT} = {}) {
  if (!outputPath) throw Error('GitHub output path is required.');
  let knownBase = false, changedPaths = null;
  if (eventName === 'pull_request') {
    try {
      // GitHub PR checkout uses a test merge: HEAD^1 is the target branch.
      git(['rev-parse', '--verify', 'HEAD^1'], {stdio:['ignore','pipe','ignore']});
      const names = git(['diff', '--name-only', '--no-renames', '-z', 'HEAD^1', 'HEAD']);
      changedPaths = names.split('\0').filter(Boolean);
      knownBase = true;
    } catch {
      knownBase = false; // Unknown diff: run all checks.
    }
  }
  const scope = chooseCheckScope({eventName,changedPaths,knownBase});
  if (scope === 'docs') {
    // Docs-only PRs must still fail on introduced whitespace defects.
    git(['diff', '--check', 'HEAD^1', 'HEAD'], {stdio:'inherit'});
  }
  appendFileSync(outputPath, 'docs_only=' + (scope === 'docs' ? 'true' : 'false') + '\n');
  console.log(scope === 'docs'
    ? 'Markdown-only PR: whitespace checked; skip expensive build and browser steps.'
    : 'Full CI required: code/config/security change, manual run or uncertain ancestry.');
  return scope;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runScopeClassifier();
}
