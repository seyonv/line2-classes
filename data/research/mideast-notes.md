# mideast segment notes (Pape, Chester, Broadview, Castle Frank, Sherbourne, Bloor-Yonge)

Checked 2026-09-27/28. 35 venues in mideast.json. Every venue has a stable `id` (`mideast-<slug>`) and a `booking` field.

## booking configs
- 18 venues have a `booking` config for a class-finder direct fetcher. All 18 were run through `scrapers/direct/<platform>.mjs` on 2026-09-28 and returned classes:
  - mindbody: 9
  - marianatek: 5
  - gymdesk: 3
  - arketa: 1
- Riverdale Martial Arts is also `gymdesk`, but it is widget-only: gym `ArjXW`, academy 21723, with no subdomain or custom domain. That means `gymdesk.mjs` can't fetch it yet, because the fetcher needs `baseUrl/schedule/getevents`. The widget HTML at https://gymdesk.com/widgets/schedule/render/gym/ArjXW/program/all has the current week in `data-event-info`, the same shape the fetcher already parses. `https://gymdesk.com/widgets/schedule/getevents/gym/ArjXW?date=` returns the right envelope, but the events came back empty.
- `booking: null` means a platform with no fetcher yet. Its IDs are still in `bookingPlatform`/`bookingIds`/`scheduleApiUrl`:
  - Kilo: Energia; the public agenda API works without auth.
  - GoodLife JSON: clubs 262 and 184; `.GetClasses.<club>.undef.undef.<date>.json` works without auth.
  - WellnessLiving: Clear Cut, Redefine Fit, Ebb & Flo. Schedules are JS-only or need signed requests.
  - MyStudio: TKMT.
  - Wix Bookings: All Access, SHINE FIT.
  - Hapana: STOTT. The widget API needs a securityToken.
  - Virtuagym: Central YMCA, club 17532.
  - MC Muay Thai: its own site, with RRULE events embedded in the HTML.
  - City of Toronto FitnessTO: Wellesley CC. Times come from the open-data drop-in CSV, location 451.
- Mariana Tek location IDs are per tenant. Several tenants genuinely use 48717 (Loft, Sequins, IAM, Run the Flex); each one was checked against `<tenant>.marianatek.com/api/customer/v1/locations`.
- `test-arketa.mjs` says TJ Bloc Pilates is at "598 Danforth Ave", but tjblocpilates.com says 682 Pape Ave. The JSON uses 682 Pape.

## Gaps
- WebSearch ran out partway through (a 200-call budget shared by the session), and Bing/DDG/Mojeek block curl. Two results:
  - ClassPass presence is "unknown" for 29/35. Only 6 are "yes", from ClassPass URLs that appeared in earlier search results or on the studio's own site.
  - Showers are known for 11/35 (9 yes, 2 no). Review-based shower evidence (Yelp/Google) couldn't be reached; Yelp returns 403.
- Prices hidden behind JS booking widgets are missing: Mariana Tek (Loft, Modo, IAM, Run the Flex, Sequins drop-in), Kilo drop-in (Energia), GoodLife membership, TKMT monthly.

## Closed, moved or dropped
- Closed: Yoga Sanctuary (95 Danforth, now Ebb & Flo), Felinity (794 Broadview), Anchored Social Club, Riverdale Fitness (835 Danforth).
- Likely closed or unverifiable:
  - Cbarre: domain for sale.
  - Alborz Taekwondo: parked domain.
  - 889 Yoga: parked domain.
  - Buddha Body Yoga: no DNS.
  - Sugarmoon Yoga: site behind a 401 lock; worth a manual check, since OSM still lists it at 371 Danforth.
  - Dal Pilates: site is an admin login only.
- Moved:
  - Satori Fight Club: now at 175 Avenue Rd, nearest station Bay (central segment).
  - Paul Brown Boxfit: now 3X Sports in Leaside.
  - Egyptian Dance Academy: now at 720 Spadina.
  - Articulate Bodies: now at 1920 Yonge.
  - 646 Weightlifting: OSM says 1501 Pape, but its site says Junction Triangle.
- No adult group classes:
  - Hone Fitness (Danforth and Isabella): gym only.
  - Elements of Fitness, Toronto Physiotherapy physio-Pilates, Totum Pilates Rosedale, Lyft Fitness: private sessions only.
  - Danforth Dance Arts: kids only.
  - Frankland CC: sports and swim drop-ins only.
- Other segments:
  - F45 Danforth and MOTIV (836/842 Danforth): nearest station Donlands.
  - Tidal CrossFit and Toronto Yoga Co: Coxwell area.
  - Barry's Yorkville and CrossFit YKV: Bay.
  - FIIT Co, Fortis, Primal, Dwell and Ethereal BJJ: Leslieville, more than 1.3 km from any of my stations.
- No CrossFit box other than Energia (formerly CrossFit Greektown), and no stretch (1.2–1.6 km) CrossFit or BJJ gym, has a nearest station in this segment.
- Energia's "Free Intro" is a consultation, not a class.
