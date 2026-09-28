# Line 2 classes

A personal class finder: every bookable fitness class near a TTC Line 2 (Bloor-Danforth) station for the
next 7 days, with walk time from the station, stops from Victoria Park, drop-in price, ClassPass credit
estimate, and whether the place has showers.

**Live:** https://seyonv.github.io/line2-classes/

## Sources
- ClassPass: venues, classes and amenities, plus a weekly scan of recent reviews for shower mentions (`scrapers/classpass.mjs`, runs in a real Chromium because of Cloudflare).
- Studio booking systems: Mindbody, Momence, Mariana Tek, Wodify, Zen Planner, PushPress, Gymdesk, Arketa, TeamUp, Punchpass, Glofox, bsport, Walla (`scrapers/direct/`).
- City of Toronto open data: FitnessTO drop-ins at community centres (`scrapers/city.mjs`).
- `data/venues.json`: researched venues with prices, intro offers, showers (with sources) and booking-system ids.

## Refresh
`./refresh.sh` pulls everything, rebuilds `docs/data.json`, checks it (`tools/check.mjs`) and pushes.
A launchd job (`launchd/com.seyonv.line2-classes.plist`) runs it at 5:30am and 2pm.

The launchd job runs from a separate clone at `~/.local/share/line2-classes` because macOS blocks
background jobs from reading `~/Desktop`. That clone pulls `main` before every run, so push code changes
and the next scheduled run picks them up.
