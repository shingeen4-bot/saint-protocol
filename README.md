# Saint Protocol

Dark-purple, local-first iPhone personal progression tracker (React + Vite PWA).

## Source upload still required
The deployment workflow and .gitignore are in place, but the app source files have not been uploaded to this repository yet.

1. Download the Saint Protocol v0.4 ZIP from the ChatGPT conversation.
2. Extract the ZIP on a computer.
3. In GitHub, open **Add file → Upload files**.
4. Drag the **contents** of the extracted `saint-protocol` folder into the GitHub uploader, including `src`, `public`, `tests`, `index.html`, `package.json`, `vite.config.ts`, and `tsconfig.json` (not the enclosing folder).
5. Commit to `main`. The preinstalled workflow at `.github/workflows/deploy.yml` will run `npm install`, `npm test`, and `npm run build` before deploying.
6. In **Settings → Pages**, choose **GitHub Actions** as Source.

Deployment URL (after a successful run): https://shingeen4-bot.github.io/saint-protocol/

This source repository is public, but user progress is held in the iPhone's IndexedDB. Export JSON backups using the app's Settings.

**Release state:** not verified or deployed yet. An npm install/build and iPhone PWA test remain necessary.
