# VerseNest GitHub handoff

This repository contains the complete tested source export from the existing VerseNest Site, including frontend, API routes, database schema and migrations, branding, print/PDF support, tests, and build helpers.

See [the handoff guide](docs/GITHUB_HANDOFF.md) for setup and hosting requirements. GitHub stores the source; the live application remains at https://versenest-family.star-joyce23.chatgpt.site . Production family records and collected emails remain in the protected live database and are not included here. GitHub changes do not automatically deploy.

## Original source history

The complete original Sites Git history (12 source versions), plus the tested export preparation commit, is preserved in [VerseNest-history.bundle](docs/history/VerseNest-history.bundle).

To restore that history as a local repository:

```sh
git clone docs/history/VerseNest-history.bundle VerseNest-restored
cd VerseNest-restored
npm ci
npm run build
```

The GitHub main branch contains the imported working source; the original commit ancestry is preserved in the bundle.
