# CI pipeline flow

## Location

The workflow file is `.github/workflows/ci.yml` at the **repository root**
(`devops-trial/`), one directory above `devops-automation-poc/`. GitHub
Actions only discovers workflows under `.github/workflows/` at the actual
Git repository root — confirmed during the Milestone 2 audit, where
`git rev-parse --show-toplevel` resolved to the parent of this project
folder, not to `devops-automation-poc/` itself. All paths inside the
workflow (`devops-automation-poc/app`, `devops-automation-poc`) account for
that.

## Triggers

```
push        -> branches: [main]
pull_request -> branches: [main]
workflow_dispatch (manual)
```

## Job: `build-test-verify`

A single job, one `ubuntu-latest` runner, steps run in order — a later step
only runs if every prior step succeeded (GitHub Actions' default
fail-fast-within-a-job behavior), except the final cleanup step which is
marked `if: always()` so a container is never left running after a failed
run.

```
 1. actions/checkout                     (pinned to a full commit SHA)
 2. actions/setup-node (Node 24, npm cache keyed on app/package-lock.json)
 3. npm ci            (in devops-automation-poc/app)
 4. npm test          (in devops-automation-poc/app)        ──┐
                                                                │ failing test
                                                                │ stops the
                                                                │ pipeline here
 5. Resolve build metadata                                     │ (Phase 4)
    - commit_sha      = github.sha                             │
    - build_timestamp = `git show -s --format=%cI <sha>`       │
      (the commit's own author date → same commit always       │
      resolves to the same timestamp, so this value is          │
      reproducible across re-runs, not wall-clock "now")        │
 6. docker build                                                │
    --build-arg GIT_COMMIT_SHA=<commit_sha>                     │
    --build-arg BUILD_TIMESTAMP=<build_timestamp>                │
    -t devops-automation-poc:<commit_sha>                        │
    (image tagged by commit SHA, as required)                    │
 7. docker run -d -p 3000:3000 ...        <──────────────────────┘
 8. Poll `docker inspect ... State.Health.Status` until `healthy`
    (bounded retry loop; `unhealthy` or timeout fails the job)
 9. curl /    and curl /health            (expect success)
10. curl /version, parse `.commit`, compare to <commit_sha>
    (mismatch fails the job)
11. docker logs + docker rm -f             (always runs — cleanup)
```

## Why a single job instead of separate `test` / `build` jobs

The task's execution list (checkout → install → test → build → verify →
cleanup) is an ordered pipeline where each stage depends on the one before
it (there is no parallelism to exploit — you cannot build the image before
tests pass, and you cannot verify a container that hasn't been built). A
single job expresses that ordering directly and keeps the Docker build
artifact available in the same filesystem/workspace as the steps that
start, probe and tear down the container, without needing to pass the
built image between jobs (which would require uploading/downloading an
image artifact or pushing to a registry mid-pipeline — out of scope for
this milestone).

## Security posture (Phase 3)

| Principle | How it's applied |
|---|---|
| Minimum `GITHUB_TOKEN` permissions | Workflow-level `permissions: contents: read` — the only thing the job needs (checkout). No write permissions are granted anywhere. |
| Pinned third-party actions | `actions/checkout` and `actions/setup-node` are pinned to full commit SHAs (not tags), with the version as a trailing comment for readability. SHAs were looked up live from the GitHub API, not guessed. |
| No unnecessary secrets | The workflow defines and uses zero secrets. `GIT_COMMIT_SHA`/`BUILD_TIMESTAMP` are derived from public `github.sha` and commit metadata, not secret values. |
| No credentials in logs | Nothing sensitive is ever echoed; all `run` steps operate on public build metadata and HTTP responses from the app itself. |
| No deployment operations | The job builds, runs and verifies a container locally on the runner, then deletes it. Nothing is pushed to a registry or deployed anywhere. |

## Controlled failure demonstration (Phase 4)

A temporary modification to `app/tests/app.test.js` on a short-lived branch
(`ci-failure-demo`, never merged to `main`) asserted the wrong HTTP status
for `/health` (`201` instead of the real `200`). A pull request from that
branch into `main` (PR #1) triggered two real GitHub Actions runs:

- **Failing run** —
  [41284912198](https://github.com/harsh15520/devops/actions/runs/41284912198),
  commit `0c8fb53`: `npm test` failed at step 5; steps 6–11 (resolve
  metadata, Docker build, start container, health wait, endpoint checks,
  version check) were all **skipped**; step 12 (cleanup) still ran
  successfully with nothing to clean up.
- **Fixed run** —
  [41284971284](https://github.com/harsh15520/devops/actions/runs/41284971284),
  commit `8d949eb`: reverting the test assertion to `200` restored a fully
  green run — all 12 steps succeeded, including the `/version` commit-SHA
  match against `8d949eb`.

This confirms a failing test blocks the Docker build/run/verify stages, and
correcting it restores pipeline success, without ever landing the
intentional failure on `main`.
