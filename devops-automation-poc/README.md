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

## Known limitations (Milestone 1)

- No CI/CD pipeline yet (GitHub Actions is planned for a later milestone).
- No remote deployment target.
- The Git commit SHA reported by `/version` falls back to `"unknown"` when
  the application is not run from inside a Git repository (e.g. a stripped
  build context without `.git`); it can be supplied explicitly via the
  `GIT_COMMIT_SHA` environment variable or Docker build arg.
