import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

function resolveCommitSha() {
  if (process.env.GIT_COMMIT_SHA) {
    return process.env.GIT_COMMIT_SHA;
  }
  try {
    return execSync('git rev-parse HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

// Captured once at process start; overridable so a Docker build can bake in
// the real build time instead of the container's first-run time.
const buildTimestamp = process.env.BUILD_TIMESTAMP || new Date().toISOString();
const commitSha = resolveCommitSha();

export function getVersionInfo() {
  return {
    name: pkg.name,
    version: pkg.version,
    commit: commitSha,
    buildTimestamp,
  };
}
