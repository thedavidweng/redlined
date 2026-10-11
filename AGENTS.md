Redlined is a public design series: before/after redesigns of real products' UI/UX, posted on X.
Each product folder holds a 1:1 mock and one subfolder per improvement ("redline").
No build step locally; pages open from disk. Pushing to main deploys to GitHub Pages via `_tools/build.py`. Python and Playwright run via `uv`.

Read only what your task needs:
- Designing or changing a redline: [docs/design.md](docs/design.md)
- Adding a redline or product, naming, verifying: [docs/redlines.md](docs/redlines.md)
- Recording clips, tweet format, media specs: [docs/presentation.md](docs/presentation.md)
- Writing READMEs or captions: [docs/writing.md](docs/writing.md)

Commit only when asked.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/` (gitignored). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded on each issue's `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
