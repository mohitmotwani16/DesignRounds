export default {
  blocks: [
    { type: "p", text: "This is a complete dimensional model for a ride-hailing service like Uber or Ola, and a harder model than retail: trips have a multi-stage lifecycle, every trip has two locations, prices include surge, drivers are measured by how they spend their time, and shared rides carry several riders in one vehicle. The service runs about **20 million trip requests a day** in 600 cities across many time zones. Analysts need hourly freshness for operations and exact daily numbers for finance." },

    { type: "h2", text: "1. Requirements" },
    { type: "table", head: ["Team", "Question", "Modeling consequence"], rows: [
      ["Operations", "Requests, completed trips and cancellations by city, zone and hour; where in the lifecycle do cancellations happen?", "Trip lifecycle accumulating snapshot with milestone dates and lags"],
      ["Marketplace", "Rider wait time and ETA accuracy by zone and time of day; how often does surge apply?", "Pickup zone dimension, time-of-day dimension, surge band attribute"],
      ["Finance", "Gross bookings, surge revenue, driver payouts and take rate by city and product", "Additive money facts split into base, surge, tolls, fees and payout"],
      ["Driver success", "Hours online, on-trip and idle per driver; utilisation by city", "Driver activity periodic snapshot"],
      ["Growth", "Riders' first trip, repeat usage, promotion effectiveness", "Rider dimension with first-trip date, promotion dimension"],
    ] },
    { type: "p", text: "Data realities: trip events stream in from apps and can arrive minutes late or out of order; fares are finalised after drop-off and sometimes adjusted days later (refunds, disputes); riders and drivers change cities and vehicles; times must be reported in each city's local time." },

    { type: "h2", text: "2. Bus matrix" },
    { type: "table", head: ["Process (fact)", "Type", "Date / time", "Rider", "Driver", "Zone", "Product", "Payment", "Promotion"], rows: [
      ["Trip requests and trips", "Transaction", "✓", "✓", "✓", "✓ (pickup, drop-off)", "✓", "✓", "✓"],
      ["Trip lifecycle", "Accumulating snapshot", "✓ (each milestone)", "✓", "✓", "✓", "✓", "", ""],
      ["Driver activity", "Periodic snapshot (hourly)", "✓", "", "✓", "✓", "✓", "", ""],
      ["Fare adjustments", "Transaction", "✓", "✓", "✓", "", "✓", "✓", ""],
      ["Incentive eligibility", "Factless (coverage)", "✓", "", "✓", "✓", "", "", "✓"],
    ] },

    { type: "h2", text: "3. Trips (transaction fact)" },
    { type: "p", text: "**Grain: one row per trip request**, whether it completes or is cancelled. Choosing requests rather than completed trips keeps cancellations and unfulfilled requests in the same table, so conversion (completed ÷ requested) is a simple ratio of two sums." },
    { type: "diagram", kind: "flow", caption: "The trip star. Zone and date each play two roles; the trip status and flags live in small dimensions so the fact stays narrow.", nodes: [
      { id: "f", label: "fact_trip", sub: "fares · distance · duration · counters", col: 1.5, row: 1, shape: "db", tone: "accent", w: 220 },
      { id: "r", label: "dim_rider", sub: "SCD2 · home city", col: 0, row: 0, tone: "store" },
      { id: "dr", label: "dim_driver", sub: "SCD2 · vehicle · tier", col: 1.5, row: 0, tone: "store" },
      { id: "z", label: "dim_zone", sub: "role: pickup / drop-off", col: 3, row: 0, tone: "store" },
      { id: "d", label: "dim_date + time of day", sub: "local and UTC roles", col: 0, row: 2, tone: "store" },
      { id: "p", label: "dim_product", sub: "UberX · XL · Pool", col: 1.5, row: 2, tone: "store" },
      { id: "s", label: "dim_trip_status / flags", sub: "status · surge band · airport", col: 3, row: 2, tone: "store" },
    ], edges: [
      { from: "f", to: "r" }, { from: "f", to: "dr" }, { from: "f", to: "z" }, { from: "f", to: "d" }, { from: "f", to: "p" }, { from: "f", to: "s" },
    ] },
    { type: "code", code: `
create table fact_trip (
  request_date_local_key  int not null,  -- dim_date, city-local calendar
  request_date_utc_key    int not null,  -- dim_date, for global reporting
  request_time_of_day_key int not null,  -- dim_time_of_day (minute grain, local)
  rider_key               int not null,  -- version valid at request time
  rider_profile_key       int not null,  -- mini-dimension: rating band, trip-count band
  driver_key              int not null,  -- -2 = "No driver assigned" for unfulfilled requests
  pickup_zone_key         int not null,  -- role-playing dim_zone
  dropoff_zone_key        int not null,  -- role-playing dim_zone; -2 when never dropped off
  product_key             int not null,
  trip_status_key         int not null,  -- completed, rider cancelled, driver cancelled, unfulfilled
  trip_flags_key          int not null,  -- junk: surge band, airport, scheduled, accessibility
  payment_method_key      int not null,
  promotion_key           int not null,
  currency_key            int not null,
  trip_id                 varchar(36),   -- degenerate dimension
  is_completed            smallint,      -- 0/1 counters make rates sums
  is_cancelled            smallint,
  distance_km             decimal(8,2),
  duration_min            decimal(8,2),
  base_fare_local         decimal(12,2),
  surge_amount_local      decimal(12,2), -- additive; the multiplier itself is non-additive
  tolls_fees_local        decimal(12,2),
  gross_booking_local     decimal(12,2),
  gross_booking_usd       decimal(12,2), -- converted at the request-date rate
  driver_payout_usd       decimal(12,2),
  surge_multiplier        decimal(4,2)   -- kept for display and banding only; never summed
)
partition by (request_date_utc_key);
` },
    { type: "h3", text: "Surge: a non-additive number" },
    { type: "p", text: "A surge multiplier of 1.8 can't be summed or averaged meaningfully across trips. Store the **surge amount** (fare attributable to surge) as an additive fact, so surge revenue share is `sum(surge_amount) / sum(gross_booking)`. Put a **surge band** (none, 1-1.5×, 1.5-2×, 2×+) in the junk flags dimension for grouping, and keep the raw multiplier only for display." },
    { type: "h3", text: "Two locations, one dimension" },
    { type: "p", text: "Pickup and drop-off both point at `dim_zone` through role-playing views (`dim_pickup_zone`, `dim_dropoff_zone`). A zone is a hexagonal geospatial cell (an H3 cell, for example) with a flattened hierarchy: zone, neighbourhood, city, region, country, plus attributes such as airport flag and time zone. Raw latitude and longitude stay in the lake; the warehouse groups by zone." },
    { type: "h3", text: "Time zones" },
    { type: "p", text: "A trip at 23:30 in Mumbai and one at 23:30 in New York are both \"late evening\" for local operations but fall on different UTC days. Store both a local date key and a UTC date key, plus a local time-of-day key. City dashboards use local keys; global finance closes the day on UTC." },

    { type: "h2", text: "4. Dimensions" },
    { type: "table", head: ["Dimension", "Key attributes", "History", "Notes"], rows: [
      ["dim_rider", "rider_id, home city, signup date, first-trip date, account type (personal or business)", "Type 2 on home city and account type", "Durable key for counting unique riders across versions"],
      ["dim_rider_profile", "rating band, lifetime-trips band, membership tier", "Mini-dimension (Type 4)", "Changes too often for Type 2 on 100 million riders"],
      ["dim_driver", "driver_id, city, vehicle make, vehicle type, onboarding date, driver tier", "Type 2 on city, vehicle type and tier", "A vehicle change must not rewrite past trips"],
      ["dim_zone", "zone id, neighbourhood, city, region, country, time zone, is_airport", "Type 1 (zones rarely change)", "Role-playing: pickup and drop-off"],
      ["dim_product", "product (UberX, XL, Pool, Auto), capacity, is_shared", "Type 2", "Products are launched and retired per city"],
      ["dim_trip_status", "status, cancelled by (rider, driver, system), stage at cancellation", "Static", "Small lookup"],
      ["dim_trip_flags", "surge band, is_airport_trip, is_scheduled, is_accessible", "Static", "Junk dimension"],
      ["dim_date, dim_time_of_day", "calendar, fiscal, holiday flags; hour, minute, day part", "Static", "Local and UTC roles"],
      ["dim_payment_method, dim_promotion, dim_currency", "method, wallet; promo code, type; ISO code", "Type 1", "\"No promotion\" row"],
    ] },

    { type: "h2", text: "5. Trip lifecycle (accumulating snapshot)" },
    { type: "p", text: "**Grain: one row per trip request, updated at each milestone:** requested, matched to a driver, driver arrived, rider picked up, dropped off, or cancelled. It answers the operational questions that the transaction fact can only answer with painful self-joins over events." },
    { type: "diagram", kind: "timeline", caption: "A trip's stages (illustrative times) and the lag facts the snapshot stores for each. A cancellation fills the cancelled timestamp and records the stage it happened in.", ticks: ["0 min", "4 min", "8 min", "12 min", "16 min", "20 min", "24 min"], spans: [
      { from: 0, to: 0.5, label: "match", lane: 1, tone: "accent" },
      { from: 0.5, to: 2, label: "driver en route", lane: 0, tone: "store" },
      { from: 2, to: 2.5, label: "board", lane: 1, tone: "cache" },
      { from: 2.5, to: 6, label: "on trip", lane: 0, tone: "ok" },
    ], marks: [{ at: 0, label: "requested" }, { at: 2.5, label: "picked up" }, { at: 6, label: "dropped off" }] },
    { type: "code", code: `
create table fact_trip_lifecycle (
  trip_id                 varchar(36) primary key,
  pickup_zone_key         int not null,
  product_key             int not null,
  driver_key              int not null,
  requested_ts            timestamp,     -- precise times for ordering and lags
  matched_ts              timestamp,
  arrived_ts              timestamp,
  picked_up_ts            timestamp,
  dropped_off_ts          timestamp,
  cancelled_ts            timestamp,
  requested_date_key      int not null,  -- and one date key per milestone ("Not yet" row until then)
  dropped_off_date_key    int not null,
  seconds_to_match        int,
  seconds_driver_en_route int,           -- rider wait time
  eta_quoted_seconds      int,
  eta_error_seconds       int,           -- actual arrival minus quoted ETA
  seconds_on_trip         int,
  cancellation_stage      varchar(20),   -- before match, before arrival, after arrival
  is_completed            smallint,
  is_cancelled            smallint
);
` },
    { type: "p", text: "Events arrive late and out of order, so the load is an idempotent MERGE on trip_id that only fills a milestone if its timestamp is newer or still empty. Keep the raw event stream in the lake: the snapshot is a derived view of it and can be rebuilt after a bug." },

    { type: "h2", text: "6. Driver activity (periodic snapshot)" },
    { type: "p", text: "**Grain: one row per driver per hour per zone they were online in.** Drivers are measured by how they spend time, which is state, not events." },
    { type: "code", code: `
create table fact_driver_activity_hourly (
  hour_date_local_key  int not null,
  hour_of_day_key      int not null,
  driver_key           int not null,
  zone_key             int not null,
  product_key          int not null,
  minutes_online       decimal(6,2),  -- additive within the hour; sum across hours for totals
  minutes_on_trip      decimal(6,2),
  minutes_en_route     decimal(6,2),
  minutes_idle         decimal(6,2),
  trips_completed      int,
  earnings_usd         decimal(12,2),
  primary key (hour_date_local_key, hour_of_day_key, driver_key, zone_key, product_key)
);
` },
    { type: "p", text: "Minutes are additive, unlike balances, so weekly online hours are a sum. Utilisation is a ratio: `sum(minutes_on_trip) / sum(minutes_online)`, never an average of hourly percentages. Only hours with activity are stored, which keeps the table to roughly drivers online × hours rather than every driver for every hour." },

    { type: "h2", text: "7. Incentive coverage (factless fact)" },
    { type: "p", text: "Driver incentives (\"complete 20 trips this weekend in zone X for a bonus\") need a record of who was **eligible**, not just who earned it. A factless coverage table, `fact_incentive_eligibility` (date, driver, zone, promotion), lists eligible driver-zone-days. Joined with driver activity, it answers \"did eligible drivers go online more than ineligible ones?\", which the payout records alone can never show." },

    { type: "h2", text: "8. Shared rides: one vehicle, several riders" },
    { type: "p", text: "A pooled trip carries several riders, each with their own pickup, drop-off and fare. Forcing that into `fact_trip` at one row per vehicle trip makes the rider multivalued. The cleaner fix is to **change the grain**: `fact_trip` is one row per **rider request**, which already gives every rider their own fare and locations. A small `fact_vehicle_trip` (one row per vehicle journey, with distance driven and occupancy) carries the driver-side measures, and both share `trip_group_id` as a degenerate dimension. No bridge table is needed, and no fare is ever double counted. See [hierarchies and bridge tables](/learn/hierarchies-and-bridge-tables) for when a bridge is the right tool instead." },

    { type: "h2", text: "9. Questions the model answers" },
    { type: "code", code: `
-- Request-to-completion rate and cancellations by stage, per city and day (local time)
select z.city, d.full_date,
       sum(t.is_completed) * 1.0 / count(*)          as completion_rate,
       sum(case when l.cancellation_stage = 'after arrival' then 1 else 0 end) as cancelled_after_arrival
from fact_trip t
join fact_trip_lifecycle l on l.trip_id = t.trip_id  -- same grain (one row per request), so this join is safe
join dim_zone z on t.pickup_zone_key = z.zone_key
join dim_date d on t.request_date_local_key = d.date_key
group by z.city, d.full_date;

-- Median rider wait by pickup zone during the evening peak
select z.neighbourhood, percentile_cont(0.5) within group (order by l.seconds_driver_en_route) as median_wait_s
from fact_trip_lifecycle l
join dim_zone z        on l.pickup_zone_key = z.zone_key
join dim_time_of_day h on extract(hour from l.requested_ts) = h.hour   -- or a stored time-of-day key
where h.day_part = 'Evening peak' and l.is_completed = 1
group by z.neighbourhood;

-- Surge share of gross bookings by city and product, last month
select z.city, p.product_name,
       sum(t.surge_amount_local) / nullif(sum(t.gross_booking_local), 0) as surge_share
from fact_trip t
join dim_zone z    on t.pickup_zone_key = z.zone_key
join dim_product p on t.product_key = p.product_key
join dim_date d    on t.request_date_local_key = d.date_key
where d.month = '2026-09' and t.is_completed = 1
group by z.city, p.product_name;

-- Driver utilisation by city, last week
select z.city, sum(a.minutes_on_trip) / nullif(sum(a.minutes_online), 0) as utilisation
from fact_driver_activity_hourly a
join dim_zone z on a.zone_key = z.zone_key
join dim_date d on a.hour_date_local_key = d.date_key
where d.week = '2026-W39'
group by z.city;
` },

    { type: "h2", text: "10. Follow-up questions and answers" },
    { type: "table", head: ["Interviewer asks", "A strong answer"], rows: [
      ["A fare is refunded three days later.", "Append a row to a fare adjustment transaction fact dated on the adjustment; don't update the original trip. Net bookings = trips + adjustments, drilled across on trip date or adjustment date."],
      ["A driver switches from a hatchback to an SUV.", "Type 2 on vehicle type: a new driver row from the change date. Past trips keep the old version; a durable driver id counts the same driver across versions."],
      ["We need trips per minute for a live operations map.", "That is a streaming aggregate in a real-time store, not the warehouse. The warehouse model stays the source of truth and reconciles with it daily."],
      ["How do you count unique riders per month?", "Count distinct durable rider ids, not surrogate keys, which differ across versions. For very large scale, store HyperLogLog sketches per day and merge them."],
      ["Zones are redrawn next quarter.", "Keep old zones; map trips to the zone version valid at the time (Type 2 on the zone dimension), or keep raw coordinates in the lake to re-zone history if the business wants it restated."],
      ["How big is fact_trip?", "About 20 million rows a day, around 150 bytes per row compressed: a few GB a day and a few TB a year. Partition by UTC date and cluster by city and product."],
    ] },

    { type: "h2", text: "Common mistakes on this problem" },
    { type: "ul", items: [
      "Modelling only completed trips, which makes cancellation and conversion analysis impossible.",
      "Averaging surge multipliers or hourly utilisation percentages instead of summing additive parts.",
      "One date key in UTC only, so city reports split evenings across two days.",
      "Joining a driver activity snapshot to trips directly, mixing an hourly grain with a per-trip grain.",
      "Storing pickup and drop-off as two different dimensions instead of one zone dimension in two roles.",
      "Updating the original trip row for refunds, so finance can't reproduce a closed day.",
    ] },
  ],
  uses: [
    { name: "Ride-hailing and taxi platforms", text: "Trip requests, a lifecycle snapshot and driver activity around shared rider, driver and zone dimensions." },
    { name: "Food and parcel delivery", text: "The same pattern with orders, a courier lifecycle snapshot and courier activity per hour and zone." },
    { name: "Field service and logistics", text: "Jobs with milestones (assigned, travelling, on site, done) as accumulating snapshots and technician time as periodic snapshots." },
  ],
  interview: [
    "Choose request grain so cancellations and conversion live in one table.",
    "Use one zone dimension in two roles, and store local and UTC date keys.",
    "Store surge as an additive amount and the multiplier only for display.",
    "Add an accumulating snapshot for the trip lifecycle and a periodic snapshot for driver time.",
    "Solve shared rides by changing the grain to one row per rider request.",
  ],
  related: ["dimensional-model-example-ecommerce", "fact-table-types", "dimension-table-techniques", "hierarchies-and-bridge-tables", "geospatial-indexing", "dimensional-modeling-interview-guide"],
  practice: ["playback-sessionization", "ad-click-aggregator", "ride-hailing"],
  reading: [
    { title: "Dimensional Modeling Techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/" },
    { title: "H3: Uber's Hexagonal Hierarchical Spatial Index", publisher: "Uber Engineering", url: "https://www.uber.com/blog/h3/" },
  ],
};
