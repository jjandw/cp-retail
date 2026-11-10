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

## Advisor

After applying the Advisor migration, deploy the `advisor` Edge Function from this checkout with `supabase functions deploy advisor --project-ref <ref> --use-api`. The function verifies the user's access token with Supabase Auth and reads the saved request for that user. Set `DEEPSEEK_KEY` and `ADVISOR_ALLOWED_ORIGINS` in Edge Function secrets. The latter is a comma-separated list of exact site origins. Supabase supplies the server-side project credentials.

Set `VITE_ENABLE_ADVISOR=true` on the hosting build after testing both Advisor surfaces on the intended project. The function shares the existing numerical validators and reserves at most 64 model attempts per UTC day. Run `node --test supabase/tests/advisor.test.mjs` and apply `supabase/tests/advisor_policies.sql` only to a test database.

## Softr history

Provide an object keyed by `products`, `scenarios`, `decisions`, `datasets`, `aiRequests`, `testFeedback` and `advisorVotes`. Each value is the full paginated Softr API record array. Retain the original export in approved private storage.

- `node scripts/softr-history.mjs` reads the export on stdin and prints a count-only validation report.
- `node scripts/import-softr-history.mjs` reads the same export and tests it in a rolled-back database transaction. Set `PGHOST`, `PGDATABASE`, `PGUSER` and the appropriate private connection settings for the intended Postgres project first.
- `--apply` commits the import only when all source owners match unique verified Supabase accounts. Use `--quarantine-retained` when records with unresolved ownership or other invalid data have been retained with the original export. Existing rows with the same source IDs and owners are preserved.

Unfinished legacy reviews import as failed so that a historic queue cannot start a new model call. Apply only after checking owner counts and retaining the original export outside the Git repository.

For GitHub collaboration, use this directory as the application root. On Cloudflare Pages, set the build command to `npm run build` and the output directory to `dist`. The app needs the host to serve `index.html` for client routes such as `/workspace`. Use branch previews to verify changes before merging them into the production branch.
