# Microservices and Kubernetes: Lab 2 - Docker Compose and deployment

In Lab 2 you will deploy a Docker Compose service in a live environment. For the purposes of this lab, for the duration of the lab on Friday you will be given a Hetzner environment where you can experiment with this setup.

You have two choices:
- In case you've finished [Lab 1](https://github.com/darktohka/kubernetes-lab-02-docker), you can choose to extend your Docker container with a docker-compose.yaml environment:
  1. First, create the corresponding docker-compose.yaml environment that will start your Docker container, as if you were starting it with a simple Docker command.
  2. You can test with `docker compose up -d`, or shut down your environment with `docker compose down`.
  3. Add an external database to your code that persists data over the previous in-memory storage mechanism.
  4. Create two new networks: one for your backend and one for your database. Connect your backend to both networks, but connect the database only to the database network.
  5. Add the new database to the docker-compose, and have the application connect to it through its **container name**.
- You can also choose to install any self-hosted application that is packaged using a Dockerfile. For example, try [Immich](https://docs.immich.app/install/docker-compose), an awesome Google Photos alternative.

Try to deploy the application in the live environment!

If possible, set up Caddy as your web server.

Fork this repository and continue your work here.

---

## Solution

This repo extends the Lab 1 [`notes-api`](notes-api/) (NestJS) with a Compose stack:

```
                 ┌────────────── backend ──────────────┐   ┌───── database (internal) ─────┐
internet ─80/443─▶ notes-caddy ──▶ notes-api:3000 ─────┼───┼──▶ notes-db:5432 (PostgreSQL)  │
                 └─────────────────────────────────────┘   └───────────────────────────────┘
```

| Service | Image | Networks | Published ports |
|---------|-------|----------|-----------------|
| `caddy` (`notes-caddy`) | `caddy:2.10-alpine` | `backend` | `80`, `443`, `443/udp` |
| `notes-api` | built from `./notes-api` | `backend`, `database` | none |
| `notes-db` | `postgres:18-alpine` | `database` | none |

- **Database**: the JSON file store from Lab 1 was replaced by PostgreSQL (`pg` driver). The API reaches it by its **container name**, `PGHOST=notes-db`, and creates the `notes` table at startup. Data lives in the `notes-db-data` volume.
- **Networks**: `notes-api` is attached to both networks, `notes-db` only to `database`. `database` is `internal: true`, so the database has no route out and can't be reached from the host or from Caddy (`notes-caddy` can't even resolve `notes-db`).
- **Startup order**: `notes-db` has a `pg_isready` healthcheck, `notes-api` waits for it (`depends_on: condition: service_healthy`) and has its own `/health` check, which also pings the database. Caddy waits for a healthy API.
- **Caddy**: reverse proxy for `notes-api:3000`. The site address comes from `SITE_ADDRESS`. With `:80` it serves plain HTTP, and with a domain name it gets a Let's Encrypt certificate automatically and redirects HTTP to HTTPS.

### Running it locally

```bash
cp .env.example .env          # then set POSTGRES_PASSWORD
docker compose up --build -d
docker compose ps             # all three should be healthy/running

curl -s http://localhost/health
curl -s -X POST http://localhost/notes -H 'Content-Type: application/json' \
  -d '{"title":"lab 2","body":"stored in postgres"}'
curl -s http://localhost/notes

docker compose down           # notes survive: they are in the notes-db-data volume
docker compose down -v        # also wipes the database
```

### Deploying to the Hetzner server

```bash
# on the server (Docker + compose plugin installed, ports 80/443 open)
git clone <this fork> && cd kubernetes-lab-02-docker-compose
cp .env.example .env
#   POSTGRES_PASSWORD=<openssl rand -hex 16>
#   SITE_ADDRESS=notes.example.com     # DNS A record -> server IP
#   (no domain? use <server-ip>.sslip.io, e.g. 203.0.113.10.sslip.io)
docker compose up --build -d
docker compose logs -f caddy          # watch the certificate being issued
curl -s https://notes.example.com/health
```
