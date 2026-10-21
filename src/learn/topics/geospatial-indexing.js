export default {
  blocks: [
    { type: "p", text: "**Geospatial indexing** makes location queries fast: \"drivers within 2 km\", \"restaurants in this map view\", \"which delivery zone contains this point\". A normal index on latitude and longitude can't answer these well, because a range on latitude and a range on longitude together still match a huge band of the planet. Geospatial indexes map two-dimensional space onto structures that keep **nearby places close together**." },

    { type: "h2", text: "Why two separate indexes don't work" },
    { type: "p", text: "`WHERE lat BETWEEN a AND b AND lng BETWEEN c AND d` can use an index on one column, then must filter a whole horizontal strip of the world by the other. Geospatial indexes instead divide space into **cells** so a nearby search only examines a few small cells." },

    { type: "h2", text: "Geohash" },
    { type: "p", text: "A **geohash** encodes a point as a short string by repeatedly halving the world: each bit says \"left or right\" then \"top or bottom\", and every 5 bits become one base-32 character. Longer strings are smaller cells, and points that share a prefix are in the same cell." },
    { type: "table", head: ["Geohash length", "Cell size (approx.)", "Good for"], rows: [
      ["4", "39 km × 20 km", "City-level"],
      ["5", "4.9 km × 4.9 km", "Neighbourhood search"],
      ["6", "1.2 km × 0.6 km", "Nearby drivers or stores"],
      ["7", "153 m × 153 m", "Street level"],
    ] },
    { type: "p", text: "Because geohashes are strings, a normal B-tree index on the geohash column turns \"same cell\" into a **prefix match**. To find things near a point, search its cell **and the 8 neighbouring cells** (a point near a cell's edge has close neighbours just across the boundary), then filter by exact distance." },
    { type: "diagram", kind: "flow", caption: "A nearby search checks the user's cell plus its eight neighbours, then computes exact distances only for candidates in those nine cells.", nodes: [
      { id: "nw", label: "tdr1u", col: 0, row: 0, tone: "muted", w: 100 }, { id: "n", label: "tdr1v", col: 0.7, row: 0, tone: "muted", w: 100 }, { id: "ne", label: "tdr1y", col: 1.4, row: 0, tone: "muted", w: 100 },
      { id: "w", label: "tdr1s", col: 0, row: 0.7, tone: "muted", w: 100 }, { id: "c", label: "tdr1t", sub: "user here", col: 0.7, row: 0.7, tone: "accent", w: 100 }, { id: "e", label: "tdr1w", col: 1.4, row: 0.7, tone: "muted", w: 100 },
      { id: "sw", label: "tdr1e", col: 0, row: 1.4, tone: "muted", w: 100 }, { id: "s", label: "tdr1g", col: 0.7, row: 1.4, tone: "muted", w: 100 }, { id: "se", label: "tdr1k", col: 1.4, row: 1.4, tone: "muted", w: 100 },
      { id: "q", label: "Filter by exact distance", sub: "haversine ≤ 2 km", col: 2.6, row: 0.7, tone: "ok", w: 190 },
    ], edges: [{ from: "e", to: "q" }] },

    { type: "h2", text: "Quadtrees" },
    { type: "p", text: "A **quadtree** recursively splits a square region into four children, but only where there is a lot of data. Dense downtown areas get deep, small cells; empty ocean stays one big cell. Each leaf holds at most a fixed number of points (say 100)." },
    { type: "ul", items: [
      "**Pros**: adapts to uneven density, so every leaf holds a similar amount of work.",
      "**Cons**: usually an in-memory structure that must be rebuilt or rebalanced as points move.",
    ] },

    { type: "h2", text: "S2 and H3 cells" },
    { type: "p", text: "Google's **S2** projects the sphere onto a cube and numbers cells along a Hilbert space-filling curve, so nearby cells usually have nearby 64-bit IDs. Any region can be covered by a set of cell-ID ranges, which map to ordinary index range scans. Uber's **H3** uses hexagons, whose neighbours are all the same distance away, which is convenient for surge pricing, supply and demand heatmaps and other aggregations." },

    { type: "h2", text: "Comparison" },
    { type: "table", head: ["Approach", "Storage", "Strength", "Typical use"], rows: [
      ["Geohash", "String column + B-tree", "Simple; works in any database or Redis", "Nearby search, caching by cell"],
      ["Quadtree", "In-memory tree", "Adapts to density", "Location services with uneven load"],
      ["R-tree (PostGIS, GiST)", "Database index", "Polygons, bounding boxes, exact geometry", "Maps, zones, complex shapes"],
      ["S2 / H3 cells", "Integer cell IDs + B-tree", "Uniform cells, good coverings, aggregations", "Ride-hailing, delivery zones, analytics"],
    ] },

    { type: "h2", text: "Moving objects" },
    { type: "p", text: "Ride-hailing and delivery apps track millions of drivers whose locations change every few seconds. Writing every update to a disk-based index is wasteful. A common design keeps live locations **in memory**, keyed by cell (for example Redis `GEOADD`, which uses geohash-based sorted sets), updates a driver's cell only when it changes, expires drivers that stop sending heartbeats, and writes location history to a separate time-series or log store." },
  ],
  uses: [
    { name: "Uber", text: "Created H3 hexagonal indexing for dispatch, pricing and analytics, and matches riders with nearby drivers using in-memory cell-indexed supply." },
    { name: "Google Maps and Foursquare", text: "Use S2 cells to index places and quickly cover map viewports and search areas." },
    { name: "Redis GEO", text: "GEOADD and GEOSEARCH store points in sorted sets by geohash, a quick way to build \"find nearby\" features." },
    { name: "PostGIS", text: "Adds R-tree (GiST) indexes and geometry functions to PostgreSQL for polygons, routes and zone lookups." },
  ],
  interview: [
    "Never propose a plain lat/lng range scan at scale; name a cell-based index (geohash, S2/H3, quadtree).",
    "Remember edge cases: search the neighbouring cells, then filter by exact distance.",
    "Keep fast-moving locations in memory with TTLs, separate from history storage.",
    "Choose cell size from the search radius, and widen the search if too few results come back.",
  ],
  related: ["database-indexing", "sharding", "caching", "time-series-databases", "nosql-database-types"],
  practice: ["dating-app", "ride-hailing"],
};
