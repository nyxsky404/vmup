# AGENTS.md

CLI for batching files over SSH so a remote coding agent gets one folder path.

Human notes: `CONTRIBUTING.md`. Leave `web/AGENTS.md` and `web/CLAUDE.md` alone (Next.js regenerates them).

## Layout

- CLI: `src/` (TypeScript). Do not commit `dist/`
- Docs site: `web/` (Next.js). Product docs: `web/content/docs/`. Search-intent guides: `web/content/learn/`
- npm package: `@nyxsky404/vmup`; command: `vmup`

## When to touch what

| Kind of work | Changelog | Docs | Version bump + npm |
| --- | --- | --- | --- |
| User-facing CLI (command, flag, default, output, JSON, error, exit code) | Yes | Yes, every page that states the fact | Only when cutting a release |
| Docs/site/Learn copy only | No | Yes | No |
| Tests / refactor, same behavior | No | No | No |
| New docs or Learn page | No (unless it ships with a CLI change) | Page + nav + SEO (see below) | No |

## 1. CLI change → docs everywhere

A user-facing CLI change is not done until every surface that describes it matches the code.

### Always

1. `CHANGELOG.md` — bullet under `## Unreleased`
2. `web/content/docs/changelog.mdx` — **same bullets** (hand-copied, not generated)
3. `--help` text in `src/cli.ts` if a command/flag/description changed
4. Tests in `src/*.test.ts` if behavior changed, then `npm run build && npm test`

### Then every page that states the fact

| If you changed | Also update |
| --- | --- |
| Command | `web/content/docs/reference/commands.mdx`, matching guide, `README.md` Commands |
| Flag | `reference/flags.mdx`, `src/cli.ts`, guides that name it, `README.md` Usage |
| Config key / default | `reference/config.mdx`, `README.md` Config, `src/constants.ts` if the default lives there |
| Env var | `reference/env.mdx` (and config page if it overlays the same key) |
| `--json` fields | `reference/json.mdx`, `README.md` JSON, `src/output.ts` |
| Exit code | `reference/exit-codes.mdx`, `README.md` |
| Error string | `reference/errors.mdx` |
| TTL / sweeper / prune | `explain/ttl.mdx`, `guides/cleanup.mdx`, `README.md` Cleanup, homepage TTL copy if the default changed |
| Clipboard / prompt | `guides/clipboard.mdx`, `guides/clipboard-for-agents.mdx`, `guides/screenshots-to-agent.mdx`, `README.md`, `web/content/docs/index.mdx`, `web/app/(home)/page.tsx`, `web/lib/shared.ts` (`appDescription`) |
| Collect mode (args, picker, clip, watch) | matching guide, `explain/how-it-works.mdx`, homepage beats |
| File types / `--video` / `--force` | `reference/file-types.mdx`, `guides/restrict-types.mdx` |
| SSH / profiles | `guides/ssh.mdx`, `guides/profiles.mdx`, `explain/ssh-modes.mdx`, `README.md` Profiles |
| Quickstart steps | `quickstart.mdx`, `README.md` Quickstart, `web/lib/schema.ts` HowTo if steps changed |
| Product one-liner / defaults | `README.md`, `web/content/docs/index.mdx`, `web/lib/shared.ts`, homepage |

`docs/plans/vmup-design.md` only if the product definition changed (pipeline, naming, defaults, platforms).

`README.md` is what npm shows. Stale README = stale npm page after publish.

## 2. Cut a release (version + changelog + npm)

Do this only when publishing. Everyday PRs stay on `## Unreleased`.

### Changelog freeze

In **both** `CHANGELOG.md` and `web/content/docs/changelog.mdx`:

- Rename `## Unreleased` to `## x.y.z — YYYY-MM-DD`
- Put an empty `## Unreleased` back on top
- Keep the two files identical

### Version (all of these, same number)

CLI version is **hardcoded**. Updating only `package.json` will not change `vmup --version`.

- `package.json` → `version`
- `package-lock.json` (via `npm install` at repo root after the bump)
- `src/constants.ts` → `PACKAGE_VERSION` (this is `--version` and the update notice)
- `web/package.json` → `version` (private site; keep in lockstep)
- `web/package-lock.json`
- `web/lib/shared.ts` → `softwareVersion` (JSON-LD)
- `web/content/docs/install.mdx` — “You should see x.y.z”
- `web/content/docs/reference/commands.mdx` — “Version is x.y.z in this tree”

Do **not** bulk-replace version strings in `src/update-check.test.ts`. Those are fixtures.

### Before `npm publish`

```bash
npm run build && npm test
npm pack --dry-run
```

Confirm:

- [ ] Git working tree is what you intend to ship (docs + changelog + version on the same commit)
- [ ] `prepublishOnly` will run `build` + `test` (already in `package.json`; do not skip with `--ignore-scripts`)
- [ ] `npm pack --dry-run` includes `dist/`, `scripts/install.sh`, `README.md`, `LICENSE`, `CHANGELOG.md`
- [ ] Pack list does **not** include `src/`, `web/`, tests (`dist/**/*.test.js` is excluded), `.env`, keys
- [ ] `package.json` `homepage` is `https://vmup.dev`
- [ ] `package.json` `files` lists any new runtime artifact (a new script under `scripts/` is omitted until added here)
- [ ] `vmup --version` after build prints the **new** version (`node dist/cli.js --version`)
- [ ] CI would pass: root `npm test` (Node 18+) and `web/` `npm run build`

Publish the CLI package only (`@nyxsky404/vmup` at repo root). Never publish `web/` (`private: true`).

```bash
npm publish
```

Access is already `publishConfig.access = public`.

### After publish

- [ ] `npm view @nyxsky404/vmup version` is the new version
- [ ] npm README still looks right (it is repo `README.md`)
- [ ] Docs site on `main` matches (Vercel). Version bump + changelog.mdx must be pushed, not only published to npm
- [ ] Optional: git tag `vx.y.z` on that commit if you are tagging releases (no GitHub Release workflow in this repo)

`scripts/install.sh` on **GitHub `main`** is what `curl …/install.sh` runs. It installs npm `latest`. A curl user can get new code only after both: (1) `npm publish`, (2) `main` has the matching commit.

## 3. New page (crawlable, LLM-readable, SEO)

Do not add a file and stop. A page that is not in the nav, not in the Learn registry, or that duplicates another URL is either invisible or a 404 in the sitemap.

### Should this page exist?

Searchable first, then shareable. One URL, one search intent. Skip the page if it fails any of these:

- Someone would type this query (or need this job) before they know vmup
- The product actually solves it (SSH batch → one remote folder + prompt)
- No existing URL already owns that intent
- The body is unique, not a title swap of another page

**Docs vs Learn (do not mix intents):**

| Collection | URL | Intent | Voice |
| --- | --- | --- | --- |
| Docs | `/docs/…` | Using vmup (install, flags, config, how-to) | Product language: `vmup --clip`, TTL, profiles |
| Learn | `/learn/…` | Problem they Google before the product | Query language: Claude Code paste SSH, clipboard error, Cursor Remote-SSH |

- Docs hub/spokes: Get started → How-to → Reference → Explain. Link spokes to the hub and to the matching reference page.
- Learn playbooks that fit: how-to, comparisons (`x vs y`), error/glossary (“no image found”), persona (`Cursor Remote-SSH`). Do not mass-generate city/tool variants. Quality over count.
- Cannibalization: if `/learn/claude-code-paste-image-ssh` exists, do not add `/learn/paste-screenshot-claude-ssh`. Cross-link docs ↔ learn instead of cloning.

Slug: kebab-case, keyword in the path, no dates, no `/docs/index` or `/learn/index` (those 308 to the hubs; robots disallow them).

### Frontmatter

Every MDX file:

```mdx
---
title: Unique H1 that matches the query or job
description: One or two sentences that answer the query. Unique per page. Include the phrase a searcher would use.
---
```

- First paragraph answers the query. Do not open with “In this guide…”
- `h2`s match the job or the FAQ (`## Why paste fails over SSH`, not `## Overview`)
- Keyword in title, description, first paragraph, one `h2`, and the slug — once each, not stuffed
- On-page H1 can be short; SERP title is a separate map (below)
- Docs how-tos: keep a visible step sequence. Learn articles: keep a `## Quick answers` section whose questions match `learnFaqs` verbatim
- Link out to the parent hub, 2–4 sibling pages, and the product CTA (`/docs/install`, `/docs/quickstart`) where the reader is ready
- No orphan pages (zero inlinks)

### Register the URL (or Google gets a 404)

**Docs** (`web/content/docs/…`):

- Add the slug to that folder’s `meta.json` (`guides/`, `reference/`, `explain/`, or `web/content/docs/meta.json`)
- If it is an entry point, add a card/link on `web/content/docs/index.mdx`
- Cross-link from the closest existing guide/reference/explain page
- Add `web/lib/shared.ts` → `docsSeoTitles`

Fumadocs then picks it up for HTML, sidebar, search (`/api/search`), `sitemap.xml`, OG (`/og/docs/…/image.png`), and `/llms.mdx/docs/…/content.md`.

**Learn** (`web/content/learn/…`) — MDX alone is not a page. `generateStaticParams` and the article gate use `learnArticleUrls`. A file that is only in `content/learn/` can appear in the sitemap and still 404.

Add the same slug in **all** of:

1. `web/content/learn/<slug>.mdx`
2. `web/content/learn/meta.json` `pages`
3. `web/lib/learn.ts` → `learnArticleUrls` (this is crawl + HTML)
4. `web/lib/learn.ts` → `learnPostMeta` (`date`, `tag`)
5. `web/lib/shared.ts` → `learnSeoTitles` (`'/learn/<slug>': 'SERP title with the query'`)
6. `web/lib/learn.ts` → `learnFaqs` (visible Q&A; JSON-LD FAQPage). Questions must match `## Quick answers` on the page
7. `web/lib/learn.ts` → `learnHowTos` when the page is a procedure. Each `hash` must equal the heading id (`## Save the screenshot as a file` → `save-the-screenshot-as-a-file`)

`llms.txt`, `llms-full.txt`, the Learn hub, related links, and Article/FAQ/HowTo schema all read that registry. Skip a line and LLMs plus Google disagree.

### SERP title + schema

Rules already used on this site:

- Unique title and description per URL
- Put `vmup` in the SERP title if the H1 does not already contain it (`docsSeoTitle` / `learnSeoTitle` will suffix ` — vmup` otherwise)
- Do not reuse another page’s title or description

JSON-LD WebPage/BreadcrumbList/OG image are automatic from the page templates.

Add extra schema in `web/lib/schema.ts` only when the page type needs it:

- Install/quickstart-style docs procedure → `HowTo` (mirror `installHowTo` / `quickstartHowTo`; heading hashes must match)
- Explain pages already render as `TechArticle`
- Do not emit FAQPage JSON-LD unless those questions are on the page in text

Do not set `noindex` on HTML docs/learn pages. Markdown mirrors already send `X-Robots-Tag: noindex`.

### Crawl + LLM check (required before merge)

From `web/`: `npm run build`. Then confirm:

| Check | Docs | Learn |
| --- | --- | --- |
| HTML 200, not 404 | `/docs/<path>` | `/learn/<slug>` (fails if missing from `learnArticleUrls`) |
| Canonical is the HTML path | yes | yes |
| In `sitemap.xml` | yes | yes, and that URL must 200 |
| Sidebar or Learn hub lists it | `meta.json` | hub uses `learnArticleUrls` |
| Search index | automatic | automatic once MDX exists; HTML still needs the registry |
| SERP title map | `docsSeoTitles` | `learnSeoTitles` |
| LLM index | `/llms.txt` (docs auto) | `/llms.txt` Learn section (registry) |
| LLM full dump | `/llms-full.txt` | same; Learn section is registry-based |
| Per-page markdown | `/llms.mdx/docs/<path>/content.md` or `/docs/<path>.md` | `/llms.mdx/learn/<slug>/content.md` or `/learn/<slug>.md` |
| OG image | `/og/docs/<path>/image.png` | `/og/learn/<slug>/image.png` |

`robots.txt` allows `/` and disallows `/api/`, `/llms.mdx/`, `/*.md$`. Do not add HTML pages under those prefixes. Do not block `/docs` or `/learn`.

Accept-markdown negotiation is already in `web/proxy.ts`. You do not add a second markdown pipeline.

### What not to do

- Thin programmatic pages (same body, swapped tool name)
- Two pages for one query
- Learn slug in docs voice (`/learn/vmup-clip-flag`) or docs slug in error-message voice unless it is really a CLI reference
- FAQ schema for questions the article does not answer
- Shipping Learn MDX without `learnArticleUrls` (sitemap 404)
- Forgetting `docsSeoTitles` / `learnSeoTitles` (tab title falls back to a short H1)

## 4. Verify

```bash
npm run build && npm test
```

Tests run against `dist/`. `npm test` without a build is stale.

Docs site, from `web/`: `npm run build` (CI does this) or `npm run dev`.

## 5. Product copy

- No vendor names in defaults or templates
- Success label: `Agent folder:`
- Default prompt: `Please inspect all files in {{remote_path}}`
- Native Windows unsupported; WSL is fine
- Do not commit `dist/`, `.env`, `.env.local`, SSH keys, or Vercel tokens
