# Architecture

## Overview

`devops-automation-poc` is a minimal Express 5 application used as the
subject of a DevOps automation proof of concept. The goal of Milestone 1 is
to demonstrate a containerized, testable application — not to build a
feature-rich product. There are no databases, no authentication and no
external service dependencies.

## Components

```
devops-automation-poc/
  app/
    src/
      app.js      # Express app factory (no server startup side effects)
      server.js   # Starts the HTTP server using the app factory
      version.js  # Resolves name/version/commit/build-timestamp metadata
    tests/
      app.test.js # node:test suite exercising the app via fetch()
    package.json
    package-lock.json
  Dockerfile        # Multi-stage build -> minimal non-root runtime image
  .dockerignore
  compose.yaml       # Single-service Compose definition for local/demo use
  .gitignore
  README.md
  docs/
    architecture.md
```

## Design decisions

- **App/server separation.** `app.js` exports `createApp()`, a pure factory
  that returns an Express app with no listening socket. `server.js` is the
  only file that calls `.listen()`. This lets the test suite create an app
  instance per test run on an ephemeral port without needing a persistent
  background process.

- **Version metadata.** `version.js` reads `name`/`version` from
  `package.json` at module load, resolves the Git commit SHA (`git rev-parse
  HEAD`, overridable via the `GIT_COMMIT_SHA` environment variable so a
  Docker build can bake in the SHA without requiring `.git` inside the
  image), and records a build timestamp (`BUILD_TIMESTAMP` env var if set,
  otherwise the process start time). This keeps `/version` meaningful in
  both local development and containerized runs, without any CI dependency
  — CI/CD wiring is explicitly out of scope for Milestone 1.

- **Error and 404 handling.** A catch-all middleware returns a structured
  `404` JSON body for unmatched routes. A final error-handling middleware
  (four-argument signature) returns a structured `500` JSON body for
  unexpected errors, matching Express's error-handling convention.

- **Testing.** Tests use Node's built-in test runner (`node:test`) and the
  global `fetch` (available natively since Node 18), avoiding any test
  framework or HTTP client dependency. Each test run boots the app on port
  `0` (OS-assigned ephemeral port) and tears it down afterward, so tests are
  isolated and parallel-safe.

- **Docker image.** The `Dockerfile` uses a two-stage build:
  1. `builder` — installs the full dependency tree with `npm ci` against
     the committed lockfile.
  2. `runtime` — reinstalls with `npm ci --omit=dev` for a lean
     production `node_modules`, copies only the application source, creates
     and switches to a non-root `appuser`, and declares a `HEALTHCHECK`
     that calls `/health` using Node's built-in `fetch` (no `curl`/`wget`
     dependency needed in the image).

- **Docker Compose.** `compose.yaml` defines a single `app` service that
  builds the image from the `Dockerfile`, maps the configurable `PORT`,
  passes environment variables, mirrors the container `HEALTHCHECK`, and
  uses `restart: unless-stopped` — appropriate for a local demonstration
  environment without introducing orchestration concerns reserved for
  later milestones.

## Explicit non-goals for Milestone 1

- No GitHub Actions / CI pipeline.
- No remote deployment.
- No Terraform or Kubernetes.
- No AI agent.
- No database, cache, or auth service.

These are intentionally deferred to later milestones per the project plan.
