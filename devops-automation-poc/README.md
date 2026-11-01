# devops-automation-poc

A minimal Express 5 application used to demonstrate a containerized
software delivery lifecycle: application code, automated tests, a
production-oriented Docker image, and Docker Compose for local orchestration.

See [docs/architecture.md](docs/architecture.md) for design details and
project scope.

## Prerequisites

- Node.js 24 LTS and npm (for local development/testing)
- Docker Desktop (or Docker Engine) with Compose v2 (for containerized runs)

## Install dependencies

```powershell
cd app
npm install
```

## Run locally (no Docker)

```powershell
cd app
npm start
```

The server listens on port `3000` by default. Override with the `PORT`
environment variable:

```powershell
$env:PORT = "4000"; npm start
```

## Run the tests

```powershell
cd app
npm test
```

This runs Node's built-in test runner (`node --test`) against
`app/tests/`. All tests start the Express app on an ephemeral port in
process — no separate server needs to be running first.

## Build the Docker image

From the repository root (`devops-automation-poc/`):

```powershell
docker build -t devops-automation-poc:local .
```

## Run with Docker Compose

From the repository root:

```powershell
docker compose up --build
```

This builds the image (if needed) and starts the `app` service, publishing
port `3000` (override via a `PORT` environment variable before running the
command, e.g. `$env:PORT = "4000"`).

Run in the background:

```powershell
docker compose up --build -d
```

## Verify the health endpoint

```powershell
curl http://localhost:3000/health
```

Expected response: HTTP `200` with a JSON body containing `status: "healthy"`.

Also verify the homepage and version endpoints:

```powershell
curl http://localhost:3000/
curl http://localhost:3000/version
```

## Inspect container health and logs

```powershell
docker compose ps
docker inspect --format "{{json .State.Health}}" <container_id_or_name>
docker compose logs -f app
```

## Stop the environment

```powershell
docker compose down
```

## Continuous integration

A GitHub Actions pipeline builds, tests and verifies this application on
every change. The workflow file lives at the repository root (one level up
from this folder) at `.github/workflows/ci.yml`, since that is where this
project's actual Git repository root is. See
[docs/pipeline-flow.md](docs/pipeline-flow.md) for the full flow diagram and
rationale.

### Trigger conditions

- Push to `main`
- Pull requests targeting `main`
- Manual trigger via `workflow_dispatch` (the "Run workflow" button on the
  Actions tab)

### Execution stages

1. Checkout the repository.
2. Set up Node.js 24 with npm dependency caching.
3. `npm ci` in `app/`.
4. `npm test` in `app/`.
5. Resolve build metadata: the real commit SHA (`github.sha`) and a
   reproducible build timestamp (the commit's own author date, so the same
   commit always yields the same timestamp regardless of when CI runs).
6. `docker build`, tagging the image with the commit SHA and baking in
   `GIT_COMMIT_SHA` / `BUILD_TIMESTAMP` as build args.
7. Start the container and wait for its Docker `HEALTHCHECK` to report
   `healthy` (polled, with a bounded retry loop).
8. Verify `/` and `/health` respond successfully.
9. Verify `/version` reports the exact commit SHA that was checked out.
10. Stop and remove the container (always runs, even on failure, via
    `if: always()`), printing its logs first for diagnosis.

### Failure behavior

If any stage fails — a failing test, a broken Docker build, an unhealthy
container, or a `/version` commit mismatch — the job stops at that step and
is reported as failed in the Actions tab and on the commit/PR status check.
The cleanup step still runs so no container is left behind. No later stage
(e.g. the Docker build) runs if an earlier one (e.g. `npm test`) fails,
since steps run sequentially in one job and a failing step halts the job by
default.

### Inspecting workflow runs

- GitHub UI: repository → **Actions** tab → select the **CI** workflow →
  select a run to see per-step logs, timing and the final status.
- Command line (requires the `gh` CLI): `gh run list` and `gh run view
  <run-id> --log`.
- A failed run's cleanup step still logs the container's output before
  removing it, so `docker logs` output for a failed health check or
  endpoint check is visible in the Actions log for that step.

## Known limitations

- No remote deployment target (out of scope through Milestone 2).
- No Docker Hub / registry publishing yet (images are built and verified
  in CI but not pushed anywhere).
- The Git commit SHA reported by `/version` falls back to `"unknown"` when
  the application is run outside CI and outside a Git repository (e.g. a
  stripped build context without `.git`, and no `GIT_COMMIT_SHA` build arg
  supplied); CI always supplies a real value.
