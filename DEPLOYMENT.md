# Deploying without Manus Publish

No server or client code was changed. The app is still a plain Node/Express
server (tRPC + static file serving), so it runs on any platform that runs a
Node process — you're just skipping Manus's own hosting UI. Added files:

- `Dockerfile` / `.dockerignore` — build + run the existing `pnpm run build`
  / `node dist/index.js` scripts in a container.
- `render.yaml` — deploy as a normal Render **Web Service** (not via the
  Manus checkpoint/Publish flow).
- `Procfile` — for Railway, or any Heroku-style buildpack host.
- `.env.example` — every environment variable the server reads.

Any of these work for **Render, Railway, Fly.io, a VPS, or your own Docker
host**. Vercel is deliberately not included: Vercel runs your code as
short-lived serverless functions, and this app is a long-running Express
server with a stateful in-memory port-finder and Vite dev middleware — moving
it there would mean actually restructuring the server, which is the "core
project change" you asked me to avoid.

## One thing I can't change from here

Two pieces of this app call out to Manus's own backend APIs — this is
independent of where the app is *hosted*:

1. **Auth** (`server/_core/oauth.ts`, `sdk.ts`) exchanges the login code with
   `OAUTH_SERVER_URL`, a Manus-run auth service tied to your `VITE_APP_ID`.
2. **Storage** (`server/storage.ts`, `storageProxy.ts`, and the voice/image/
   map helpers) all call the Manus Forge API via `BUILT_IN_FORGE_API_URL` /
   `BUILT_IN_FORGE_API_KEY` for photo uploads, downloads, and other media.

Neither depends on Manus *hosting* your server — they're just external APIs,
the same as calling Stripe or S3 from anywhere. But the OAuth server needs
your new production domain's callback URL (`https://your-domain/api/oauth/
callback`) allow-listed for your app ID, or logins will fail after you move
off Manus's preview domain. That allow-listing has to happen wherever your
Manus app/OAuth client is registered — I don't have a way to do that from
this sandbox, and it's outside code I can edit.

If Manus ever stops issuing you Forge/OAuth credentials, uploads and login
would need real replacements (e.g. your own S3 bucket + a standard OAuth
provider) — that *would* be a core change, and a separate task from this one.

## Steps (Render example)

1. Push this repo to GitHub.
2. In Render: New → Blueprint → point at the repo → it reads `render.yaml`.
3. Fill in the `sync: false` env vars in the Render dashboard using
   `.env.example` as the reference (`DATABASE_URL`, `VITE_APP_ID`,
   `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`,
   `BUILT_IN_FORGE_API_KEY`). `JWT_SECRET` auto-generates.
4. Update the OAuth client's allowed redirect URI to your new Render URL
   (see caveat above).
5. Deploy, then smoke-test: sign in, create a post with a photo, view the
   public post page, comment, approve from moderation, and check archive
   search / load-more.

Docker path is the same idea: `docker build -t paper-ash-diary .`, run with
the env vars from `.env.example`, point it at any container host.
