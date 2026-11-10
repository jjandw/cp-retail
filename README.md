# CP Retail standalone preview

This Vite app runs the 10 November 2026 Softr Studio landing and workspace as an independent React app. The bundled images include the team's Week 8 landing visuals and workspace decorations.

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite and choose **Try demo**. To check the same build that a host serves, run `npm run build` and then `npm run preview`.

The demo keeps synthetic scenarios, datasets, linked decisions and feedback in this browser. Use synthetic CSV files for testing. The real accounts, shared database, historical records and cloud AI are separate migration steps.

For GitHub collaboration, use this directory as the application root. On Cloudflare Pages, set the build command to `npm run build` and the output directory to `dist`. The app needs the host to serve `index.html` for client routes such as `/workspace`. Use branch previews to verify changes before merging them into the production branch.
