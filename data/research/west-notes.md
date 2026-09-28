# West segment notes (Dufferin → Kipling)

`west.json` holds 66 venues, researched 2026-09-27 and 2026-09-28. Distances are straight-line (haversine) to the nearest Line 2 station, counting all stations. The limit is 1200 m, or 1600 m for CrossFit and BJJ, which are flagged `stretch: true`. Five venues are stretch: Reign Martial Arts, Junction Academy, West Toronto Strength & Conditioning, King of the Mats and Xtreme Couture.
Each venue also has an `id` slug and a `booking` field, `{platform, config}`, which follows the configs in class-finder/scrapers/direct. `bookingVerified` and `classesNextWeek` come from running every config through those fetchers on 2026-09-28; the script is west-work/verify.mjs and its output is west-work/verify-result.json.

## Environment problems
- The WebSearch budget ran out early in the session. Bing and DuckDuckGo via curl returned junk or a CAPTCHA. Instead, discovery used:
  - the OSM Overpass dump
  - the Mindbody explore geo-search API
  - City of Toronto open data ("Registered programs and drop-in courses")
  - blogTO listings
  - class-finder `data/raw/classpass.json`
  - venue websites
- ClassPass: "yes" comes from classpass.json, which covers only 137 venues. "unknown" does not mean "no".
- Shower claims based only on a ClassPass amenity flag are marked that way in `showersEvidence.quote`.

## Booking configs
- 34 venues have a config and 33 return classes.
- Junction Academy (gymdesk `junction-academy-mma.gymdesk.com`) is the exception. It redirects to /login because the public schedule is off. The widget `https://app.gymdesk.com/widgets/schedule/render/gym/lGRaW?schedule=all&program=all&days=7` does return the week as HTML, so the gymdesk fetcher could fall back to it.
- United Boxing Club (glofox branch 617c6cd77d809651230e2ac9) and Crewe Fitness (glofox 679838838bccbd584503d055) are working Toronto Glofox branches. Either could replace the NY test studio in NOTES.md.
- Mosaic Yoga (momence host 65531) also covers the Annex studio. Filtering by `locationIds` drops sessions that have no location, so filtering on the "Sterling" name suffix would be more complete.
- Mighty Mom (arketa `mightymom`) returns every Toronto location. `booking.filter` gives the Fuel Training Club location to keep, which the fetcher doesn't apply yet.
- Mariana Tek location id 48717 shows up for fueltrainingclub, theyardyoga and sweatandtonic. I checked this, and location ids are per tenant, so it's a coincidence and not a bug.
- Ultra Violet's Mindbody feed includes duplicate virtual "MATRIX" classes. Auxiliary (Wodify) and Crewe (Glofox) include open-gym slots.
- Platforms with no fetcher:
  - WellnessLiving: Fit District 402661, Body Engineers 314086, Studio V 291724, Coloured Soul
  - Acuity: Accel Fit, Hansa 38764226, Gloves Up 26831882
  - ClubReady: Club Pilates Junction, public JSON at `members.clubpilates.com/api/v2/locations/clubpilates-junction/schedule_entries`
  - Antaris: Bloor Street Fitness, public HTML at `bloorstreetfitness.antaris.ca/v2/client/classes_public/index.php`
  - GoodLife: club 189 has a JSON schedule
  - Jane App: Nest
  - Wix Bookings: Back Alley Barbell
  - WordPress timetable: Reign
  - RockGymPro: Boulderz
  - City of Toronto open data: Wallace Emerson (location 294), Annette (17), Swansea (282) and Memorial Pool (891)
  - Tempo Dance uses Momence, but I couldn't find its host id.

## Dropped: out of range, or nearest station is outside this segment
- West End YMCA: nearest is Ossington.
- Over 1200 m:
  - Power Yoga Canada Toronto West (Dufferin 1261 m)
  - Stay Gold (1583 m)
  - Mary McCormick CRC (1442 m)
  - Kondition (1398 m)
  - Yoga Village (1306 m)
  - LA Fitness Junction (1396 m)
  - High Park Martial Arts (karate, 1394 m)
  - Soul Good Boxing (1359 m)
  - The LOFT Pilates (1283 m)
  - Fortides Roncesvalles (1513 m)
  - F45 Sunnylea (1412 m)
  - Stockyards Boxing (4231 Dundas W, 1263 m; permanent home George Bell Arena is 1850 m)
  - Fitness that Fits (1232 m)
  - Singing Lotus (about 1471 m)
  - F45 Lambton-Kingsway (1491 m)
  - Industry Studio (Dufferin 1284 m)
  - Black's Boxing (1597 m)
  - Barlatës (1607 m)
  - Fearless Studios (boxing, 1503 m)
- BJJ United, 346 Ryding Ave: 1928 m, beyond even the 1600 m stretch limit.
- Modo Yoga Etobicoke, BJJ Battalion, Etobicoke Martial Arts and Solis Etobicoke: all over 2 km away.
- Toronto BJJ (813 Bloor W) and Toronto Jiu-Jitsu Club belong to the central segment.

## Dropped: closed, rebranded, or no bookable group classes
- Modo Yoga Bloor West, 2481A Bloor W: replaced by The Hummingbird Field, which is included.
- Generate Fitness: domain expired. Solis Movement opens at 2199 Bloor W in Nov 2026 and is included as "unverified".
- Maureen Rae's Yoga: studio closed; she now teaches on Zoom.
- Werkhaus Fitness: its site has been dead since 2024.
- Studio Blue: no site or location found.
- Sweat Zero and Revive Wellness Club: sauna and cold-plunge only.
- FPR Longevity: members-only circuit.
- Stretch Zone: one-on-one only.
- Arthur Murray: no public adult group calendar.
- Anytime Fitness (5245 Dundas W) and Planet Fitness: no classes.
- Pia Bouman: children's ballet.
- Motus: independent personal trainers.
- George Chuvalo Centre: social services, no fitness drop-ins.

## Unverified and not included (need a phone or Maps check)
- Redefine Fit pole studio, about 1270 Bloor W: domain has lapsed.
- Queens Fitness, 1444 Dupont.
- Reunion Yoga & Pilates.
- Cirque-ability: address not found.
- 1Halo Krunch (near Runnymede).
- Pointe Dance Centre, 349 Jane.
- Fit 1 Bootcamp (near Islington): domain has been hijacked.
- CrossFit Etobicoke and Blue Canoe Zen Gym: not found.
- A GoodLife near Dufferin Mall was not checked.

## Status caveats
- Retrofit Pilates: retrofitpilates.com says "I've closed my website", but its Mindbody schedule is live with 76 classes next week, so it is kept as open.
- Toronto Barre Collective: moved to 2489 Bloor W and resumes classes Sep 29.
- Coloured Soul Yoga: its old domain has expired, but ClassPass lists 16 classes for this week, so it is open.
- Solis Movement BWV: opens Nov 2026, so it is listed as "unverified".
- Toronto Aikikai has `categories: []` because aikido isn't in the allowed list. National Taekwondo and Northern Karate are filed under "karate".
- City of Toronto venues:
  - FitnessTO drop-ins are free, except at Memorial Pool & Health Club, where classes likely need FitnessTO All Access ($49.44/month).
  - Wallace Emerson shows no adult swim drop-ins this session.

## Biggest gaps
- Showers are "unknown" for about 40 of 66 venues.
- Many studios keep prices inside booking iframes: Fuel, F45, The Base, Club Pilates, Studio V.
- There is no pricing for King of the Mats, Xtreme Couture, Amoring, Mighty Mom or Body Buster.
