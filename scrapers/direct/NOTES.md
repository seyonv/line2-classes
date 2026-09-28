# Direct platform fetchers: notes

Every platform on the list has a fetcher, and every `test-<platform>.mjs` passes. None of them needs a login. Glofox and PushPress do get an anonymous token first, the same way their public pages do; details below.

## Status

| Platform | Status | Config | Test studio | Endpoint |
|---|---|---|---|---|
| Mindbody | working | `locationSlug` | Studio Fitology (`studio-fitology`) | `POST prod-mkt-gateway.mindbody.io/v1/search/class_times` |
| Momence | working | `hostId`, `locationIds?` | Breathe Yoga Studio (host 8672) | `GET api.momence.com/host-plugins/host/<id>/host-schedule/sessions` |
| Mariana Tek | working | `tenant`, `locationIds?`, `bookingPage?` | Sweat and Tonic (`sweatandtonic`, locations 48717, 48750) | `GET <tenant>.marianatek.com/api/customer/v1/classes` |
| Wodify | working | `subdomain`, `locationId` | AuxFit Toronto West (`auxfit`, 10063) | OutSystems `screenservices/OnlineSalesPage/...` data actions |
| Zen Planner | working | `subdomain`, `locationId?` | Tidal CrossFit (`tidalcrossfit`) | HTML `<sub>.sites.zenplanner.com/calendar.cfm?VIEW=list` |
| PushPress | working | `subdomain` | CrossFit AIO (`crossfitaio`) | `POST api.pushpress.com/v2/graph/graphql` (getPublicCalendarItems) |
| Gymdesk | working | `baseUrl` | Toronto Jiu-Jitsu Club (`torontojiujitsuclub.ca`) | `GET <baseUrl>/schedule/getevents?date=` |
| Arketa | working | `slug`, `partnerId` | TJ Bloc Pilates (`tjblocpilates`) | `GET widget-api-tkaeguucxq-uc.a.run.app/<partnerId>/schedule` |
| TeamUp | working | `providerId` | Pivot Dancer (4493058) | `GET goteamup.com/api/v2/events` + `Teamup-Provider-ID` header |
| Punchpass | working | `url` | iFreeStyle.ca (org 1281) | HTML `<url>/classes` |
| Glofox | partial | `branchId` | No Toronto branch found. The test uses Dedicated Motivated Fitness, NY | `POST api.glofox.com/2.0/login` (GUEST) then `GET /2.0/events` |
| bsport | partial | `companyId` | No Toronto studio found. The test uses Idolem Le Plateau, Montreal (1143) | `GET api.production.bsport.io/api/v1/offer/` |
| Walla | partial | `uuid`, `locationId?` | No Toronto studio found. The test uses Common Ground Yoga, MA | `GET api.hellowalla.com/api/dingo/v1/class_instances` |

"Partial" means the code works, but the test runs against a studio outside Toronto. To switch one to a Toronto studio, just change the id in the test file.

## Caveats per platform

- **Mindbody**: This only covers studios listed on Mindbody's explore marketplace, and you need the explore slug, not the site id. `price` is often null because many studios don't publish drop-in prices there. `bookUrl` links to the class page, not to one specific session. The healcode/branded-web widget path was not needed, so it was not built.
- **Momence**: `remainingSpots` is always null, so `spotsLeft` is `capacity - ticketsSold`. Multi-week courses only show up in the week of their first session. There is no waitlist count.
- **Mariana Tek**: The classes API has no price. Tenants also sell rooms and services as "classes": Sweat and Tonic lists meeting rooms, saunas and red-light beds with capacity 1, which is why the count is 779. Pick `locationIds` per tenant, and consider dropping classes that have capacity 1 and no instructor. Many classes set `is_remaining_spot_count_public: false`, but the API still returns the counts. The booking deep link (`?_mt=/classes/<id>`) was taken from the widget JS and has not been opened in a browser.
- **Wodify**: The `apiVersion` hashes are copied from Wodify's JS bundle. If Wodify changes those actions, the fetcher throws "apiVersion changed" and the hashes need to be re-read from the bundle. It makes 1 request per day, 8 for a week. The times say "Z" but are really local wall-clock times. No price.
- **Zen Planner**: The list view has no end time, so `end` is null. Parsing the week view would mean reading pixel heights, which is too fragile. The per-class `enrollment.cfm` link needs a login to actually book. No price or waitlist.
- **PushPress**: `https://<sub>.pushpress.com/` redirects to `/login`. Its `__NEXT_DATA__` holds the client uuid and a 24h anonymous "public" token, which the fetcher reads without logging in. The times say "Z" but are local. No waitlist or price.
- **Gymdesk**: Some gyms turn off the public schedule, and those redirect to `/login`. JT6 Studio in Toronto does this. `capacity` is often a default booking limit (30/50) rather than the room's real size. There is no per-class booking link.
- **Arketa**: The schedule endpoint needs `partnerId`, not the slug. Find it once by hand: it is `widget.id` in the response from `app.arketa.co/api/widget/data?widgetName=<slug>&type=classes`. That response is about 1.5MB, so the fetcher doesn't call it every day. No price. Hybrid classes appear twice, once in-studio and once virtual.
- **TeamUp**: The date filters are `starts_at_gte`/`starts_at_lte`; other names are silently ignored. Appointments are skipped.
- **Punchpass**: There is no JSON; the JSON-LD only covers 10 events. The fetcher parses the HTML list. Spots and duration appear only when the studio turns them on. No capacity or price.
- **Glofox**: The portal's own JS logs in automatically on page load with the fixed anonymous account `GUEST`/`GUEST` for the branch (`refreshGuestToken`), and the fetcher does the same. It is not a user account, but if you want no login step of any kind, this one is out. There is no public way to search branches. Search pointed to "North 12" as a Toronto Glofox studio, but its branch is in London, UK. Sully's Boxing Gym (Toronto) uses Glofox, but its branch id isn't on its website.
- **bsport**: This one is mostly French and European studios, and no Toronto customer was found. The API works in Paris time, so the fetcher widens the date range by a day on each side and then filters by the exact instant. Price is only given in credits, so `price` is null.
- **Walla**: Walla has a Toronto marketing page, but every studio it names that could be checked is in the US. The `uuid` is only in the studio's own site embed (`widget.hellowalla.com/...?uuid=`).

## Discovery tips

- Momence: grep the studio page for `host_id=`.
- Wodify: grep for `WebIntegration?LocationId=`.
- Mariana Tek: grep for `marianatek.com` or `data-mariana`.
- Arketa: grep for `app.arketa.co/iframe/<slug>`.
- Walla: grep for `hellowalla.com` and `uuid=`.
- bsport: grep for `backoffice.bsport.io/m/<name>/<id>`.
- Mindbody: search `mindbodyonline.com/explore/locations/<slug>`.
