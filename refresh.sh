#!/bin/bash
# Daily refresh: pull every source, rebuild docs/data.json, publish to GitHub Pages.
# A source that fails keeps its last good data (each scraper only writes on success).
set -uo pipefail
cd "$(dirname "$0")"
export PATH=/opt/homebrew/bin:/usr/local/bin:$HOME/.nvm/versions/node/v22.23.2/bin:$PATH
echo "=== $(date) ==="
node scrapers/city.mjs        || echo "city scrape failed"
node scrapers/direct-run.mjs  || echo "direct scrape failed"
node scrapers/classpass.mjs   || echo "classpass scrape failed"
node build.mjs || { echo "build failed"; exit 1; }
node tools/check.mjs || { echo "data check failed; not publishing"; exit 1; }
git add docs/data.json && git commit -q -m "Refresh class data $(date +%F)" -- docs/data.json && git push -q origin main
echo "published"
