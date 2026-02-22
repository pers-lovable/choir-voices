# Kör för alla

A web app for choir members to listen to individual voice tracks for songs.

## Architecture

```
Browser (React app)
    │  Basic Auth (password only)
    ▼
Cloudflare Worker  (worker/)
    │  B2 credentials stored as Worker secrets
    ▼
Backblaze B2 (private bucket)
```

The Cloudflare Worker acts as a credentialed proxy. B2 credentials never reach the browser. Backblaze B2 and Cloudflare are members of the Bandwidth Alliance, so egress between them is free.

## B2 bucket structure

```
{year}/{songName}/grön.wav
{year}/{songName}/röd.wav
{year}/{songName}/svart.wav
{year}/{songName}/instrument.wav
```

## App settings

In the app's settings view, configure:

- **Server-URL** — the Worker URL with the current year appended, e.g. `https://choir-worker.myname.workers.dev/2025`
- **Lösenord** — the shared choir password

The username field can be left as-is; the Worker ignores it.

## Deploying the Worker

Requirements: Node.js, npm, a Cloudflare account.

```bash
cd worker
npm install
wrangler login       # one-time browser auth
wrangler deploy      # creates the Worker in Cloudflare

# Set secrets (wrangler prompts for each value):
wrangler secret put B2_KEY_ID
wrangler secret put B2_APP_KEY
wrangler secret put B2_BUCKET_ID
wrangler secret put B2_BUCKET_NAME
wrangler secret put USER_PASSWORD
```

After deploy, Wrangler prints the Worker URL. Set that URL (plus `/year`) as the Server-URL in the app.

### Secrets reference

| Secret | Description |
|---|---|
| `B2_KEY_ID` | Backblaze application key ID |
| `B2_APP_KEY` | Backblaze application key |
| `B2_BUCKET_ID` | Backblaze bucket ID (used for listing) |
| `B2_BUCKET_NAME` | Backblaze bucket name (used for downloads) |
| `USER_PASSWORD` | Shared password for choir members |

### Updating the Worker

```bash
cd worker
wrangler deploy
```

## Developing the frontend locally

Requirements: Node.js, npm.

```bash
npm install
npm run dev
```

## Technologies

- React, TypeScript, Vite
- shadcn-ui, Tailwind CSS
- Cloudflare Workers (backend proxy)
- Backblaze B2 (file storage)
