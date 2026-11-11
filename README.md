# VerseNest

Private family Scripture-memory tracker with ChatGPT parent accounts, Verse-a-thon practice, lifetime memory history, and PDF exports. Built with React/Vinext on Sites, using D1 for account records and separate offline device copies for each parent.

## Parent accounts and owner tools

Invited parents sign in with ChatGPT and create a parent profile. The account email comes from the authenticated platform identity. Updates are an optional unchecked choice during signup and can be withdrawn in Account & email preferences. Versioned consent events preserve the date, wording, email, and choice.

The confirmed owner can open Parent signups and export only consenting subscribers as CSV. This exports parent contact information, never children’s verse records. No email is sent automatically or connected to an email provider. Campaigns need an email service that handles unsubscribe links and suppression; refresh exports before each send.

The Site remains owner-private until its access policy is explicitly changed. Creating signup functionality does not invite friends or open registration publicly. The server-only owner email in `src/server/accountApi.ts` must be reviewed if ownership changes.

## Records and privacy

Family API queries use authenticated Site user IDs. Requests from an already-open app are also checked against the expected account to prevent a save following a browser account switch. Browser keys are namespaced by parent ID. Only the confirmed original owner adopts the pre-signup legacy device copy; originals remain preserved. Other parents start with their own empty family.

Online parent signup is required. A previously authenticated tab can use its account-scoped device copy offline. Keep occasional downloaded family backups, and do not clear browser data while sync is pending.

## Validate

Use Node.js 22 or newer (Node 24 for the SQLite-backed account tests):

```sh
npm ci
npm run dev
npm test
npm run test:accounts
node --import tsx scripts/test-lifetime.ts
npm run test:interactions
npm run test:pdf
npm run test:pdf-render
npm run test:template-transfer
npm run build
npm run test:pwa
npm run test:pwa-update
```

Account tests run the generated migrations against an isolated in-memory SQLite database and exercise the real route handlers. They test consent, withdrawal, owner authorization, pagination, family isolation, account-switch protection, device migration, signup UI, and owner controls. PDF tests check exact page identity across preview, download, and print. These checks do not replace real-device/browser QA.

## Hosting and storage

The existing identity and DB binding are in `.openai/hosting.json`. Deploy the supported Worker build with the Sites workflow; migrations live in `drizzle/`. Do not deploy `dist/client` alone or change the Site audience as part of a code update.

## Install on a phone

Open the private URL online, sign in, and complete parent signup. On iPhone, use Safari → Share → Add to Home Screen. Complete a first online launch before testing offline. Installing may use a separate browser storage context; online account storage restores completed saves on the new device context.
