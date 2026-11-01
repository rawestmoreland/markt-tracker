# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Markt Tracker: a map of (Zürich-area) Christmas markets. A PocketBase (Go) backend serves a static Leaflet frontend and a `markets` collection via PocketBase's REST API.

## Commands

- Run the server: `make run` (`go run . serve --http 'localhost:8080'`). Serves the frontend at `/` and the PocketBase API/admin UI (`/_/`) on the same port.
- Build CSS (Tailwind v4 CLI, from `pb_public/`): `npx @tailwindcss/cli -i input.css -o output.css --watch`. `output.css` is the compiled file referenced by `index.html`.
- Seed markets: `cd pb_public && node import.mjs` (Node 18+). Reads `markets.json` and POSTs each record to the `markets` collection as a superuser. Configure with `PB_URL`, `PB_EMAIL`, `PB_PASSWORD` env vars (the script has hardcoded dev credential defaults; prefer env vars and don't copy them elsewhere).
- No tests or linter are configured.

## Architecture

- `main.go` is a minimal PocketBase app; its only customization is an `OnServe` hook that serves `./pb_public` as static files at `/{path...}`. Data lives in `pb_data/` (gitignored; the SQLite DB, including the `markets` collection schema, is created/edited via the PocketBase admin UI, not in code — there are no migrations checked in).
- `pb_public/` is the whole frontend: plain `index.html` + `app.js` (no bundler), Leaflet loaded from unpkg, OpenStreetMap tiles. `app.js` fetches `/api/collections/markets/records` and drops a marker per record with `lat`/`lng`. Note it currently uses a hardcoded `http://localhost:8080` URL, so a relative URL is needed for any non-local deploy.
- `markets.json` defines the record shape: `name`, `slug`, `lat`, `lng`, `address`, `description`, `website`, `hours`, `region`, `opens`/`closes` (PocketBase datetime strings, e.g. `2026-11-19 00:00:00.000Z`). The `markets` collection must have matching fields for `import.mjs` to succeed.
- `pb_public/node_modules` and `package*.json` exist only for the Tailwind CLI; `package*.json` and `.env*` are gitignored.
