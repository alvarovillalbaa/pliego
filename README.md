# Pliego

<!-- project-family:start -->
> **Project family:** [Web & Creative Apps](https://github.com/alvarovillalbaa#web-and-creative-apps) · **Area:** Design
<!-- project-family:end -->

Last updated: 2026-11-14

A Spanish-first poster and lighting studio. Create original generative artwork,
adjust palette/size/margins/frame, preview its scale on your wall, and explore
floor/pendant/table lamp forms. Download the actual poster SVG at physical size,
a2400px-high PNG preview, a room SVG or an editable JSON project. Save immutable
local versions and reopen them without an account.

**[Open Pliego](https://pliego-zeta.vercel.app)** ·
[Desktop](docs/results/2026/11-14/attempt-1/B01.png) ·
[Phone](docs/results/2026/11-14/attempt-1/B02.png)

Runtime: ten static files, native ES modules, HTML/CSS/SVG and browser APIs.
No dependencies, tracking, account, AI provider or database. System fonts and
original procedural graphics; no borrowed photography or fabricated products.

## Run

Node22+; no install required. `npm start` serves only the explicit public files
on127.0.0.1:4173. `npm run build` copies that same allowlist to dist for Vercel.

```sh
npm run check
npm test
git diff --check
```

Keep20 saved versions at most. Saves append rather than overwrite, and use Web
Locks to serialize cooperating tabs. Malformed libraries stay intact and have a
raw recovery download; unsupported/invalid/oversized JSON imports leave the
draft untouched. Import/open asks before replacing a changed unsaved draft.
Storage events refresh the library without replacing the current draft.

Local versions are not cloud backups. Clearing site data removes them; export
JSON to keep a copy. Private mode/storage quota/unsupported Web Locks may prevent
saving; exports and the working draft remain available. PNG is a preview, not a
300dpi print claim. Room scale is proportional; light is illustrative, not lux.
No physical commerce/manufacturing or generative-AI acceptance is implied.

See the [owner brief and contract](docs/specs/studio.md) and the
[focused qualification scope](docs/plans/2026/11-14/studio-checks.md).
MIT licensed. [Qualification and delivery](docs/results/2026/11-14/studio.md)
records24 local core passes, four first-run hosted journeys and one changed
recovery completion. All40 public HTTP bodies, eight downloads and16 original
outer streams verify. The original and updated recovery screenshots remain
separate. Physical print/color/lighting, devices and commerce remain open.
