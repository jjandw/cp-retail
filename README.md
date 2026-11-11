# CP Retail Decision Assistant

This Vite app runs the 10 November 2026 Softr Studio landing and workspace as an independent React app. The bundled images include the team's Week 8 landing visuals and workspace decorations.

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite and choose **Try demo**. To check the same build that a host serves, run `npm run build` and then `npm run preview`.

With no Supabase settings, the demo keeps synthetic scenarios, datasets, linked decisions and feedback in this browser.

## Supabase workspace

Apply the SQL files in `supabase/migrations/` in filename order. The workspace migration creates a product catalogue, six account-scoped tables and the permissions they require. Keep the migration history in sync if you apply the files through the SQL Editor.

Set these values in an ignored `.env.local` file for development or in the host's build settings for a deployed site.

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The frontend uses a publishable key or legacy anon key. Both values are required for a cloud build. Configure Supabase Auth for verified email signup and add the site's exact `/workspace` and `/reset-password` URLs to its allowed redirects. Configure custom SMTP before inviting people outside the Supabase project team.

Use `supabase/tests/workspace_policies.sql` on an isolated test database to verify the pricing formulas and two-account access. The test uses synthetic identities and rolls back its data. Verify browser registration, sign-in and record ownership in the intended Supabase project before cutover.

## Homepage content

After the landing content migration is applied, a Supabase project operator assigns an `editor` and a separate `reviewer` in `public.landing_members` by verified Auth user ID. Both members use normal email sign-in. Open **Account settings → Content studio** or go directly to `/content`.

1. The editor changes the title, introduction, promotional image, image description, and demo link. Save the draft, open **Preview homepage**, then submit for review.
2. The reviewer opens the submitted version and previews the same homepage. Choose **Approve and publish** to make it the current revision, or **Return to author** to request changes.
3. Open the homepage in a signed-out browser to confirm the current copy and image. **Restore previous homepage** in Content studio switches back to the preceding revision and records the rollback.

Run `supabase/tests/landing_content_policies.sql` in the isolated policy suite and the content browser check in `scripts/hosted-auth.test.mjs` against the isolated Supabase stack.

## Advisor

After applying the Advisor migration, deploy the `advisor` Edge Function from this checkout with `supabase functions deploy advisor --project-ref <ref> --use-api`. The function verifies the user's access token with Supabase Auth and reads the saved request for that user. Set `DEEPSEEK_KEY` and `ADVISOR_ALLOWED_ORIGINS` in Edge Function secrets. The latter is a comma-separated list of exact site origins. Supabase supplies the server-side project credentials.

Set `VITE_ENABLE_ADVISOR=true` on the hosting build after testing both Advisor surfaces on the intended project. The function shares the existing numerical validators and reserves at most 64 model attempts per UTC day. Run `node --test supabase/tests/advisor.test.mjs` and apply `supabase/tests/advisor_policies.sql` only to a test database.

## Softr history

Provide an object keyed by `products`, `scenarios`, `decisions`, `datasets`, `aiRequests`, `testFeedback` and `advisorVotes`. Each value is the full paginated Softr API record array. Retain the original export in approved private storage.

- `node scripts/softr-history.mjs` reads the export on stdin and prints a count-only validation report.
- `node scripts/import-softr-history.mjs` reads the same export and tests it in a rolled-back database transaction. Set `PGHOST`, `PGDATABASE`, `PGUSER` and the appropriate private connection settings for the intended Postgres project first.
- `--apply` commits the import only when all source owners match unique verified Supabase accounts. Use `--quarantine-retained` when records with unresolved ownership or other invalid data have been retained with the original export. Existing rows with the same source IDs and owners are preserved.

Unfinished legacy reviews import as failed so that a historic queue cannot start a new model call. Apply only after checking owner counts and retaining the original export outside the Git repository.

For a CP Retail Windows DPAPI backup, use the same Windows user and the SHA-256 from its backup receipt. This command verifies and decrypts the archive in memory and prints the count-only validation report.

```powershell
pwsh -File scripts/restore-softr-history.ps1 -Archive <backup.dpapi> -ExpectedSha256 <sha256>
```

Use `-Mode DryRun` with the intended Postgres connection settings for a rolled-back import, or `-Mode Apply` after production approval. If the plan has quarantined records, `-Mode Apply` also requires `-QuarantineRetained` once the private source archive is verified.

## Cloud hosting

In Cloudflare **Workers & Pages → Create application → Pages → Connect to Git**, connect the private repository and choose `main` as the production branch. Use the repository root, `NODE_VERSION=24`, build command `npm run build:pages`, and output directory `dist`. Enable the branches the team uses for preview builds, including `codex/*`. Configure Cloudflare Access for team-only preview URLs before sharing them.

- **Preview** uses the bundled demo when the Supabase variables are empty. For an account-enabled preview, set its own Supabase URL and publishable key, plus `CP_RETAIL_PRODUCTION_SUPABASE_URL` set to the production Supabase origin. Use the stable branch URL for the staging Auth verification and password recovery redirects. Add it to the staging Advisor's allowlist if Advisor is enabled.
- **Production** sets `CP_RETAIL_PRODUCTION_SUPABASE_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` for the approved production project. The build writes `/release.json` with the branch and commit so reviewers can verify what Pages is serving.

Team members create a branch in GitHub and open a PR to `main`. Reviewers open the Cloudflare Pages check on the PR, verify the linked deployment's `/release.json` against the PR head, and check both GitHub Actions jobs before approving. Enable automatic production builds only after GitHub requires independent approval and passing checks on `main`. If the repository plan cannot enforce these rules, keep automatic production builds off. A maintainer checks approval and CI, merges the PR, and can deploy the reviewed `main` commit with Wrangler. Set `CF_PAGES_BRANCH=main` and `CF_PAGES_COMMIT_SHA` to that commit when running `npm run build:pages` outside Cloudflare, then run `wrangler pages deploy dist --project-name <pages-project> --branch main --commit-hash <commit>`.

After a release, check the live `/release.json` and sign-in and workspace routes. For a frontend rollback, open the Cloudflare Pages project's deployment history, find the last approved production deployment, and choose **Rollback to this deployment**. Recheck the live release and routes. Content revisions use the Content studio rollback, and Supabase schema and data use their own migration procedures.
