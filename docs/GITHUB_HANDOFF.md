# VerseNest GitHub handoff

## What this repository contains

- The complete application source: React/Vinext screens, parent signup and consent, owner signup export, family APIs, current practice and lifetime memory tracking, PDF generation/preview/printing, and the offline service worker.
- Original and web logo assets, phone icons, and the local PDF font.
- Database schema and both generated migrations in `drizzle/`.
- Dependency lockfile and automated tests.
- The twelve original Sites source commits, followed by an export-preparation commit when pushed using Git.

The portable build support is tracked under `scripts/vite/` and `worker/`. The original source referenced an ignored `build/` directory; the export supplies the licensed Sites starter helpers in tracked paths so a fresh clone can build.

## Live service

The current live app is https://versenest-family.star-joyce23.chatgpt.site . Its Sites project identity is retained in `.openai/hosting.json`. Copying the source to GitHub does not change that deployment or connect automatic deployment from GitHub.

The production Cloudflare D1 database remains attached to Sites as `DB`. Its tables are `family_documents`, `family_history`, `parent_profiles`, and `parent_consent_events`. No production rows, parent emails, children’s records, credentials, or device-local records are included here. GitHub is source control, not the application database.

Parents can download their own JSON backup through Save & backup. The owner can export consenting subscribers through Parent signups. Those private exports belong in protected backup storage, not Git history. The Sites database viewer is bounded and may truncate cells; do not mistake a viewer response for a complete database backup. A full hosting migration must obtain a complete supported database export and reconcile record counts before changing the live service.

## Develop

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
npm test
npm run test:accounts
npm run test:onboarding
node --import tsx scripts/test-lifetime.ts
npm run test:interactions
npm run build
npm run test:pwa
```

PDF raster tests additionally require the native `@napi-rs/canvas` package, declared as a development dependency in this export.

```sh
npm run test:pdf
npm run test:pdf-render
npm run test:template-transfer
```

Local development provides a test identity; production authentication is supplied by Sites. Never trust caller-supplied identity headers on a standalone deployment. Before hosting outside Sites, replace that identity boundary with an authenticated provider and review owner authorization. The existing `src/server/accountApi.ts` contains the original owner email configuration.

## Continue in desktop Codex

Open this repository and ask Codex to inspect README.md and this handoff, run the relevant tests, and preserve existing family records and signup consent. The Cloudflare Worker backend and D1 storage mean this app cannot be hosted as a static GitHub Pages project. Keep production credentials outside the repository.

## Deployment boundaries

No GitHub workflow publishes this app. The CI workflow only runs checks. Existing Sites publication uses `.openai/hosting.json` and the Sites workflow. Any migration to a different host needs a database transfer, authentication configuration, storage validation, and a separate cutover plan; do not redirect users merely because this repository was created.
