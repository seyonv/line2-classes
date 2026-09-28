# Central segment notes (Bay, St. George, Spadina, Bathurst, Christie, Ossington)

central.json has 44 venues, all open as of 2026-09-27/28. Each has an `id`, a `booking` {platform, config} block and `segment: "central"`.
There are 23 booking configs. On 2026-09-28 every one was run through `~/Desktop/repos/class-finder/scrapers/direct/<platform>.mjs` (via `central-work/vc.mjs`) and every one returned live classes: 12 mindbody, 3 momence, 3 marianatek, 2 walla, 1 wodify, 1 punchpass. Glofox appears only for United Boxing, which is out of scope here.

## How venues were found
- OSM Overpass: fitness, sports, dance, martial-arts and name-matched features within 1.65 km of each station.
- The Mindbody explore API (`prod-mkt-gateway.mindbody.io/v1/search/locations`), which works with curl and returns site ids and amenities.
- The City of Toronto open data "Registered programs and drop-in courses" drop-in CSV.
- Bloor-Yorkville BIA fitness guide, blogTO, and web searches.
- The session's WebSearch budget (200) ran out partway through discovery. Bing, DuckDuckGo and Mojeek all block curl. ClassPass and Yelp return 403. So later discovery relied on OSM, Mindbody and venue sites. Some small studios with no OSM or Mindbody footprint may be missing.

## Dropped
- **Closed:**
  - CrossFit YKV (175 Avenue Rd): the domain lapsed or is in redemption, the site is dead, and the last live snapshot is from July 2025. This leaves no CrossFit box in the central segment. The nearest is Academy of Lions, a stretch venue at 1547 m.
  - CMAC Enzan Dojo (918 Bathurst): martialartstoronto.ca now lists only its Merton and Wembley dojos.
  - Octopus Garden Yoga (967 College): yoga classes ended 2023-07-20; clinic only now. Its old 440 Bloor location is also closed.
  - SoulCycle Yorkville: closed in 2022.
  - Quad Spin: closed.
- **Out of scope:**
  - United Boxing Club, 1034 Bloor W: nearest station is Dufferin (291 m), so it belongs to the next segment. Its data is in `central-work/batch_A.json`: Glofox branchId `617c6cd77d809651230e2ac9` (verified, 45 events), showers yes, on ClassPass.
  - Central YMCA (20 Grosvenor) and Pilatika Yorkville (1 Yorkville Ave): nearest station is Bloor-Yonge.
  - Orangetheory (160 Bloor E) and STOTT Pilates (2 Bloor E): Bloor-Yonge area.
  - Montrait Muay Thai (1271 Dundas W): 1461 m, not a stretch-eligible category.
  - Body Positive Fitness, FLYT Club, AT OM Yoga, Studio3, Spinco Yonge, Krudar Muay Thai: all more than 1.2 km away.
  - KX Yorkville: clinic and personal training only.
  - FreeFlow Pilates x FarenMae: private and duet sessions only.
  - Dance Annex (527 Bloor W): room rental only (Skedda), no classes.
  - Sweat Shoppe (70 Yorkville): a coworking gym for trainers.
  - Stretch Lab: assisted stretching.
  - Oliphant's Gym (Dupont, member-run weight gym): no classes.
  - Arthur Murray and Steps Dance: partner-dance lessons.
- **Unverifiable:**
  - Urbanfitt Studio (567 College): only an OSM entry, no website found.
  - Yuj Yoga Studio and a "yoga therapy studio" near Christie: OSM points only.
- **Opening soon:** Sweat and Tonic Yorkville plus REFORMD Lagree at 11 Yorkville Ave, October 2026. Sweat and Tonic's Mariana Tek tenant is `sweatandtonic` (see the class-finder NOTES).

## Platforms with no class-finder fetcher (booking.platform is null; schedule source is in scheduleUrl/bookingIds)
- **WellnessLiving:** Jimmy's Athletics, business 416489.
- **Gymdesk widget that returns no events:** Toronto BJJ, gym `le43n`. Its timetable is only on /schedule/.
- **RockGymPro:** Basecamp Climbing.
- **Hapana:** Strong Pilates Yorkville. The public token recipe is in its notes.
- **Acuity:** Sivananda and Pilates by Stav.
- **GoodLife's public JSON class API:** both clubs.
- **Virtuagym embed:** West End YMCA.
- **Amilia plus a PDF:** Miles Nadal JCC.
- **Schedule image:** Vive Bathurst.
- **PDF:** Black Belt World.
- **U of T:** its Mindbody listing returns 0 classes; the schedule is on kpe.utoronto.ca.
- **Hart House:** the site blocks curl and WebFetch, so its data comes from archived copies (Mar–Sep 2026). Prices may be stale.
- **Esther Myers:** web form plus e-transfer.
- **City drop-ins (Bob Abate):** free, and in the open-data drop-in CSV (location id 30).

## Gaps and caveats
- **Showers:** 18 venues are "yes" with a quoted source, and 26 are "unknown"; none were guessed. The JCC, YMCA and Equinox mention locker or change rooms but never say "shower" outright. Jaybird's "yes" rests on a chain-wide page. Google reviews could not be reached.
- **ClassPass:** WebSearch was exhausted and ClassPass returns 403, so only 6 venues are "yes", taken from URLs seen earlier. The rest are "unknown", not "no".
- **Prices not published:**
  - Academy of Lions drop-in: an older snippet said $30+tax, not confirmed on the site.
  - Toronto BJJ: no open-mat or visitor fee; a 30-day free trial for new adults, booked by appointment.
  - Reunion Yoga + Pilates and Jaybird Yorkville: packages sit inside the Mariana Tek widget. Only Jaybird's intro offers are recorded.
  - Equinox and Vive: no membership prices.
- **Access limits:**
  - Recess Fit Club is not taking new members; its intro offers are paused.
  - GoodLife needs an Essential Plus or Ultimate membership for classes.
  - Equinox sells no guest pass unless you come with a member.
- **Scraper data quirks:**
  - Mosaic Annex (momence location 65924) also returns an online copy of each class, so results need de-duplicating.
  - Kula's Mindbody feed mixes Studio and Remote classes.
  - Sphinx now runs only ELDOA on Wednesdays. The Pilates groups in its space at 412 Bloor W are run by Atelier Pilates by Tmotion (momence 267342), which has its own entry.
