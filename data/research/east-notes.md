# East segment notes (Donlands → Kennedy)

Checked 2026-09-27/28. There are 24 venues in `east.json`. Each venue's nearest station on all of Line 2 is one of the east stations. Distances are straight-line haversine distances from Nominatim or Mindbody coordinates.

## Dedup rule used
I kept a venue only if its nearest Line 2 station is an east station. Venues on the Pape/Chester side of Greektown are left for the Pape segment, even though some sit within 1.2 km of Donlands: Energia Athletics (ex-CrossFit Greektown), GoodLife Danforth & Pape, MC Muay Thai (671 Danforth), Oxygen Yoga Danforth (635 Danforth), Modo Yoga, Loft, TKMT, Tanuki, Riverdale MA, Solis, Pilates Process, Hone Fitness and Clearcut.

## Closed or likely closed (dropped)
- **Legacy Indoor Cycling**, 1506 Danforth: the domain legacyindoorcycling.com no longer resolves in DNS.
- **Yoga at Woodbine**, 2170 Danforth: the domain yogaatwoodbine.com no longer resolves.
- **Toronto Top Team, 777 Warden**: the current site lists only 161 Bartley Dr, which is 2.7 km from Warden. The Warden address looks old. It would have been a BJJ stretch at 1.58 km.
- **Trillium MMA**, 770 Birchmount: the site is dead. It was 1.28 km from Kennedy.

## Out of range (checked, excluded)
- **Cornerstone Studio**: the real addresses are 2 Eastwood Rd (gym) and 1519 Gerrard E (pilates), 1.27–1.31 km from Coxwell. The "2756 Danforth" in search snippets is wrong. Mindbody slug: `cornerstone-studio`, studioid 833900. Worth adding if the radius is relaxed.
- **Pilattes**, 1610 Gerrard E: 1.28 km.
- **TyraLoveFitness**, 51 Comstock: 1.32 km from Warden.
- **Stan Wadlow Clubhouse**: 1.33 km. It has City drop-ins (yoga Mon 9:30am/Sun 9:15am, strength Fri 9:15am).
- **Steve & Sally Stavro YMCA**, 907 Kingston Rd: 1.38 km from Main.
- Also excluded:
  - Beaches Fitness (862 Kingston Rd): 1.29 km.
  - Wellbe (1120 Kingston Rd): 1.59 km.
  - Fit4Less Coxwell: 1.23 km, and it has no classes.
  - Triumph Muay Thai (789 Warden): 1.75 km.
  - Toronto Climbing Academy: 2.5 km from Main.
  - TheWorkoutLoft (Coxwell & O'Connor): about 2 km.
  - East York CRC: 1.35 km, nearest Pape.
  - Combative Concepts (1211 Kennedy Rd): far.
- **Kids-only dance schools**, not adult group fitness: Pegasus Studios (361 Glebeholme) and CityDanceArts (1915 Danforth).
- **Earl Beatty CC** has no fitness drop-ins in City data (swim only). **Terry Fox Rec Centre** has no fitness drop-ins either.

## Beaches
Nothing south of Gerrard or on Queen/Kingston is within 1.2 km of an east station, so there are no Beaches venues.

## Gaps and caveats
- **No CrossFit or BJJ in Scarborough within range.** Past Main St, the only combat or CrossFit venue is Scarberian Boxing. The only CrossFit in the whole segment is Tidal. For BJJ there is TJJC (gi + no-gi), plus no-gi only at One To One MMA.
- **Showers are confirmed for only four venues**: F45 Danforth and F45 Upper Beaches (Mindbody amenities), Crescent Town Club (website) and Scarberian (website). TYC is marked "no" by inference, because its FAQ amenity list has change-room washrooms and lockers but no showers. Everything else is "unknown": Yelp, Google and ClassPass reviews were unreachable (403), and the WebSearch budget ran out mid-task.
- **City centres with pools** (Main Square, Fairmount Park) certainly have pool change rooms. I left showers as unknown because I found no explicit source.
- **ClassPass presence** is only known where an earlier search hit a ClassPass URL: TYC, MOTIV Danforth, F45 Upper Beaches and Centreline. Everything else is "unknown" (or "no" for City centres, Crescent Town and LA Fitness).
- **Platforms with no fetcher yet**:
  - BOMB Fitness uses WellnessLiving (business `bomb_fitness`; k_business 291460 is probably Danforth, 595756 is Beach).
  - Scarberian uses Wix Bookings.
  - One To One MMA publishes its schedule as an image only.
  - LA Fitness has a print schedule at `ClassSchedulePrintVersion.aspx?clubid=1090`.
  - Danforth Karate, Sam Lumpini, Nicole Piller and Centreline have static pages or book by email.
- **City community centres**: I added `cityLocationId` so they can be pulled from the open-data Drop-in.csv (Location ID column), dataset "registered-programs-and-drop-in-courses-offering". `booking` is null because it is not one of the direct platforms.
- **Sam Lumpini**: the website hasn't been updated since 2023. It is still listed, but confirm it is operating.
- **Verified fetcher configs** (run with `node` on 2026-09-28; all returned classes for the week of 2026-09-28):
  - zenplanner `tidalcrossfit`
  - gymdesk `https://torontojiujitsuclub.ca` and `https://centraltorontowrestling.com`
  - arketa `thepinkstudio` / `9bShNWNM9qVLBxavRvjMF5Thwsy1`
  - marianatek `torontoyogaco` loc 48717
  - momence 133899 (MOTIV Danforth). Momence host 54544 is another MOTIV studio (location "Main Studio - TB"), not Danforth.
  - mindbody `f45-training-danforth-toronto`, `f45-training-upper-beaches` and `zone-x`
- **Useful discovery trick**: POST to `https://prod-mkt-gateway.mindbody.io/v1/search/locations` with `{filter:{radius,latitude,longitude,categoryTypes}}`. It works with curl but returns 403 to the Python urllib user agent. It lists all Mindbody venues near a point, including an `amenities` array (that is where the F45 shower evidence came from). This is how I found Zone X.
