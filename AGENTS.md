# Pliego

Last updated: 2026-11-14

- Owner intent: personal Notion interior-design brief, paintings/posters first,
  then lamps. The owner delegated choices and authorized portfolio source,
  free focused checks/temporary CI and Vercel publication. Preserve user work.
- Read README.md and docs/specs/studio.md. Browser-native modules, semantic HTML,
  CSS and Node built-ins; no runtime package or build/install requirement.
- Original procedural artwork only. No borrowed artist names/images, invented
  merchandise, orders/payments, generative-model or physical-product claims.
- Exports are literal SVG at selected physical dimensions and a 2400px-long-edge
  PNG preview. Room geometry is proportional; light is illustrative, not lux.
- Validate every persisted/imported field. Never render user strings as markup.
  Existing malformed storage must stay intact; offer raw recovery. Append-only
  saved versions use Web Locks; never overwrite a user draft on storage events.
- Tests live in tests/unit and tests/e2e, authored Tier2 data only. Standing
  approval covers focused unit/browser/download checks and one free public
  Chromium CI job capped20min. No account, model, database or paid plan changes.
- Storage Guard forbids local heavy work below reserve. No local browser,
  dependencies or build. Retain failed receipts and own/verify CI teardown.
- scripts/public-files.mjs is the published allowlist. Do not expose docs/tests.
  Vercel serves a static output. Verify exact team/project/source and delivery.
- Keep results in docs/results/YYYY/MM-DD; use apply_patch for edits, targeted
  syntax/core checks and git diff --check. Retire temporary CI after acceptance.
