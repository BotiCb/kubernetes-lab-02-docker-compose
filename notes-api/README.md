# Notes API

A small HTTP API written in TypeScript with [NestJS](https://nestjs.com/), packaged with Docker in Lab 1 and backed by PostgreSQL since Lab 2.

It stores short notes (title + body) in a PostgreSQL `notes` table, which it creates on startup.

- Container port: **3000** (published through Caddy, see the [top-level README](../README.md))
- Image: `docker.io/boti13/notes-api:2.0.0`

---

## API

| Method | Path | Description | Success |
|--------|------|-------------|---------|
| `GET` | `/health` | Health probe used by `HEALTHCHECK`, also checks the database | `200` / `503` |
| `GET` | `/notes` | List all notes, newest first | `200` |
| `POST` | `/notes` | Create a note from `{ "title": "...", "body": "..." }` | `201` |
| `GET` | `/notes/{id}` | Fetch one note (`id` must be a UUID, else `400`) | `200` / `404` |
| `PATCH` | `/notes/{id}` | Update the title, the body, or both | `200` / `404` |
| `DELETE` | `/notes/{id}` | Delete a note | `204` / `404` |

A note looks like this:

```json
{
  "id": "b55a980d-c823-437f-98cc-e46e341a5f4d",
  "title": "lab 1",
  "body": "docker notes",
  "createdAt": "2026-09-19T17:25:21.481Z",
  "updatedAt": "2026-09-19T17:25:21.481Z"
}
```

Request bodies are validated (`class-validator`), unknown fields are rejected with `400`.

---

## Running it

The API needs a PostgreSQL database, so run it through the Compose stack in the repository root:

```bash
cd ..
cp .env.example .env   # set POSTGRES_PASSWORD
docker compose up --build -d
curl -s http://localhost/health
# {"status":"ok","uptime":3,"database":"up"}
```

Locally, without Docker (Node 22+, pnpm, a reachable PostgreSQL):

```bash
pnpm install
pnpm build
PGHOST=localhost PGUSER=notes PGPASSWORD=... PGDATABASE=notes pnpm start
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the HTTP server listens on |
| `PGHOST` | `localhost` | Database host, `notes-db` (the container name) in compose |
| `PGPORT` | `5432` | Database port |
| `PGUSER` / `PGPASSWORD` | — | Database credentials |
| `PGDATABASE` | same as `PGUSER` | Database name |
| `NODE_ENV` | `production` in the image | Standard Node environment flag |

---

## How the image is built

The `Dockerfile` is a five stage build on `node:24-alpine`:

1. **base** — enables corepack/pnpm and copies only `package.json` + `pnpm-lock.yaml`.
2. **deps** — `pnpm install --frozen-lockfile` with a BuildKit cache mount on the pnpm store.
3. **prod-deps** — the same install with `--prod`, built from `base` rather than from `deps` so the dev dependencies never end up in the virtual store.
4. **build** — adds the sources on top of **deps** and runs `nest build`.
5. **runtime** — copies `node_modules` from **prod-deps** and `dist/` from **build**.

Consequences worth pointing out:

- Editing a file under `src/` only invalidates the last two steps: the dependency layers stay cached and nothing is re-downloaded.
- The final image has no TypeScript sources, no compiler and no nest CLI — just the compiled `dist/` and the runtime dependencies (~68 MB total, of which 62 MB is the base image).
- It runs as the unprivileged `node` user (uid 1000) that ships with the base image.
- `HEALTHCHECK` polls `/health` with busybox `wget`, so Docker reports the container as `healthy` or `unhealthy` (including when the database is unreachable).
- The app handles `SIGTERM` through Nest's shutdown hooks, so `docker stop` closes the database pool cleanly instead of a 10 second wait followed by `SIGKILL`.
