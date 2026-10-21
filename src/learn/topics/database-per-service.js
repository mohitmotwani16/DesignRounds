// Database per microservice: each service owns its data behind an API; benefits, the
// consistency and cross-service query costs, when to use it, and how to discuss it.
export default {
  blocks: [
    { type: "p", text: "In a monolith, all modules share one big database, and that coupling hurts: a schema change in one module breaks another, one slow query slows everyone, and you must scale the whole database even if only one part needs it. The **database-per-service** pattern gives each microservice **its own database** that no other service touches directly, so services can scale, change and deploy independently." },

    { type: "h2", text: "How it works" },
    { type: "p", text: "Each service owns its data completely. In an e-commerce platform, the Order Service owns order tables, the Product Service the catalog, and the Recommendation Service user-behavior data. When Order Service needs product details, it **calls Product Service's API**; Product Service queries its own database and responds. The API is the boundary: Product's schema can change freely as long as the API contract holds." },
    { type: "diagram", kind: "flow", caption: "Database per service: each service owns its store (even a different kind of database) and others reach the data only through its API or events.", nodes: [
      { id: "o", label: "Order Service", col: 0, row: 0, tone: "accent" },
      { id: "p", label: "Product Service", col: 1.6, row: 0, tone: "accent" },
      { id: "rec", label: "Recommendation Service", col: 3.3, row: 0, tone: "accent", w: 190 },
      { id: "odb", label: "PostgreSQL", sub: "orders (ACID)", col: 0, row: 1.2, shape: "db", tone: "store" },
      { id: "pdb", label: "MongoDB", sub: "flexible catalog", col: 1.6, row: 1.2, shape: "db", tone: "ok" },
      { id: "rdb", label: "Neo4j", sub: "behavior graph", col: 3.3, row: 1.2, shape: "db", tone: "cache" },
    ], edges: [{ from: "o", to: "odb" }, { from: "p", to: "pdb" }, { from: "rec", to: "rdb" }, { from: "o", to: "p", label: "GET /products/42" }, { from: "o", to: "pdb", tone: "danger", dashed: true, label: "✗ no direct access" }] },

    { type: "h2", text: "Benefits" },
    { type: "ul", items: [
      "**Independent scaling**: the Recommendation Service runs heavy analytics on a dedicated 64-core, 256 GB database server, while the Order Service does simple CRUD on smaller servers with fast SSDs. Each scales to its own needs.",
      "**Technology fit**: PostgreSQL for transactional orders, MongoDB for flexible product schemas, Neo4j for graph-shaped recommendations, each team choosing without coordination. See [SQL vs NoSQL](/learn/sql-vs-nosql).",
      "**Independent schema changes**: the Product team adds a product-dimensions column, deploys, and nobody else notices: no coordination meetings, no cross-team dependencies, faster shipping.",
      "**Clear ownership**: one team owns the schema, queries, indexes and backups, understands the access patterns, and investigates its own performance problems.",
    ] },

    { type: "h2", text: "Challenges" },
    { type: "ul", items: [
      "**Cross-service consistency**: in one database a foreign key stops you deleting a product that orders reference. Across databases that protection is gone: the Product Service would have to ask the Order Service first, and the check and the delete can't be atomic, since a new order could appear in between. Use [sagas](/learn/saga-pattern), eventual consistency, soft deletes, or accept temporary inconsistency.",
      "**Cross-service queries**: \"orders with product details\" means calling Order Service, collecting product IDs, calling Product Service, and joining in code. That's more latency and code than one SQL join. Common fixes: API composition, or a read model built from events/[CDC](/learn/change-data-capture) (CQRS).",
      "**Operational overhead**: five services mean five databases to back up, monitor, upgrade and tune, possibly in several technologies.",
    ] },
    { type: "code", code: `# Order Service keeps a local, read-only copy of the product fields it needs,
# updated from Product Service events, instead of calling the API on every request.
def on_product_event(event):                    # consumed from the "products" topic
    p = event["after"]
    orders_db.execute(
        """INSERT INTO product_snapshot (product_id, name, price)
           VALUES (%s, %s, %s)
           ON CONFLICT (product_id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price""",
        (p["id"], p["name"], p["price"]))

def order_with_products(order_id):              # a local join, no cross-service call
    return orders_db.query(
        """SELECT o.id, o.created_at, i.qty, s.name, s.price
           FROM orders o JOIN order_items i ON i.order_id = o.id
           JOIN product_snapshot s ON s.product_id = i.product_id
           WHERE o.id = %s""", (order_id,))` },

    { type: "h2", text: "When to use it" },
    { type: "p", text: "Use it for microservices with distinct scaling needs, different data access patterns or independent deployment: e-commerce (orders, catalog, analytics), social media (profiles, feeds, messaging), video streaming (accounts, content metadata, viewing history). It shines when many teams own different services: 20 teams can't coordinate every schema change, and isolation lets each move on its own. **Avoid it for small systems and early startups**: with three developers, the overhead outweighs the benefit. Start with one database (with clear module boundaries), and split when scale or team size demands. See [monolith vs microservices](/learn/monolith-vs-microservices)." },

    { type: "h2", text: "In an interview" },
    { type: "ol", items: [
      "Assign databases by service: Order, Product and Inventory each own their data; for a social network, User, Post and Notification.",
      "Explain the consistency cost: checkout must decrement inventory, charge payment and create an order across three databases with no single transaction, so use a saga with compensating actions.",
      "Mention how cross-service reads work: API calls, or read models fed by events.",
      "Acknowledge the operational cost, and that a 3-developer system with 100,000 users shouldn't do this yet.",
    ] },
  ],
  uses: [
    { name: "Large e-commerce platforms", text: "Separate stores for orders, catalog, inventory and recommendations, owned by different teams." },
    { name: "Streaming services", text: "Accounts, content metadata and viewing history in different databases sized for each workload." },
    { name: "Social networks", text: "Profiles, posts, messaging and notifications scaled and deployed independently." },
    { name: "Platform migrations", text: "Carving a service out of a monolith by giving it its own schema first, then its own database." },
  ],
  interview: [
    "Give each service its own database and forbid direct access; data moves through APIs or events.",
    "Handle cross-service workflows with sagas, and cross-service reads with composition or event-fed read models.",
    "Say when not to: small teams and early products.",
  ],
  related: ["monolith-vs-microservices", "saga-pattern", "change-data-capture", "event-sourcing-cqrs", "dataflow-patterns", "outbox-pattern"],
  practice: ["payment-platform", "ticket-booking", "service-platform"],
};
