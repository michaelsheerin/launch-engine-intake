# Launch Engine Intake

A public, optional-field workload handoff form and catalog. The sample entry is fictional. Do not enter confidential customer information in this public repository.

## Use

- Open the [catalog](https://michaelsheerin.github.io/launch-engine-intake/).
- Select **New entry**, fill any known fields, then select **Submit entry**.
- Sign in with GitHub to write. The account needs write access to this repository.
- Open a catalog row to see the full intake, then use **Edit** or **Delete**.
- Markdown works in long-text fields. Add as many workloads, contacts, meetings, exclusions, blockers, and RAID items as needed.

Records are JSON files in [`data/entries`](data/entries). Each save creates a Git commit. Deletion removes the current file; Git history retains earlier versions.

## Structure

| Path | Purpose |
| --- | --- |
| `docs/` | GitHub Pages catalog, form, and record view |
| `data/entries/` | One JSON file per workload intake |
| `worker/` | Cloudflare Worker for GitHub sign-in and authenticated writes |

The public catalog reads through the Worker when available, with a direct GitHub API fallback for reads. Writes require the Worker.

## Deployment

1. Publish GitHub Pages from the `main` branch and `/docs` folder.
2. Create a GitHub OAuth App with homepage `https://michaelsheerin.github.io/launch-engine-intake/` and callback `https://launch-engine-intake.msheerin01.workers.dev/auth/callback`.
3. Deploy `worker/worker.js` to Cloudflare with the values in `worker/wrangler.toml`.
4. Set `GITHUB_CLIENT_ID` as a Worker variable. Set `GITHUB_CLIENT_SECRET` and `SESSION_KEY` as Worker secrets. Use a long random value for `SESSION_KEY`.
5. Check the sample catalog entry, then verify create, edit, and delete using a disposable fictional record.

The OAuth App requests GitHub's `public_repo` scope. Restrict repository write access to the intended submitters. Public records must contain approved public information only.

## Local preview

Serve the repository root with a static web server, then open `/docs/`. The form works locally; the catalog reads this repository after publication.
