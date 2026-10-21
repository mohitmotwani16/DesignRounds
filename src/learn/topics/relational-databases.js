// Relational (SQL) databases: why structure and transactions exist, tables and keys, ACID,
// CRUD, where SQL fits, popular engines, and the scaling and schema-change challenges.
export default {
  blocks: [
    { type: "p", text: "A **relational (SQL) database** stores data in **tables** of rows and columns, links tables through **keys**, enforces a **schema** before data gets in, and wraps related changes in **ACID transactions**. That structure is what keeps money, orders and inventory correct when many users act at once and machines fail mid-operation. PostgreSQL, MySQL, SQL Server and Oracle are the classic examples." },

    { type: "h2", text: "The problem without structure" },
    { type: "p", text: "A bank processes a transfer: customer A sends $100 to customer B. That takes two steps: deduct $100 from A, then add $100 to B. If a network error strikes after the deduction but before the addition, A has lost $100, B has gained nothing, and the money has simply vanished." },
    { type: "diagram", kind: "flow", caption: "Partial failure without transactions: step 2 succeeds, step 3 fails, and $100 disappears. The total drops from $700 to $600 permanently.", nodes: [
      { id: "s1", label: "1. Initial state", sub: "A: $500 · B: $200", col: 0, row: 0, tone: "ok" },
      { id: "s2", label: "2. Deduct $100 from A ✓", sub: "A: $400 · B: $200", col: 1.3, row: 0, tone: "ok" },
      { id: "s3", label: "3. Add $100 to B ✗", sub: "network error", col: 2.6, row: 0, tone: "danger" },
      { id: "bad", label: "Inconsistent state", sub: "total before $700, after $600: $100 missing", col: 1.3, row: 1.2, tone: "danger", w: 300 },
    ], edges: [{ from: "s1", to: "s2" }, { from: "s2", to: "s3" }, { from: "s3", to: "bad", tone: "danger" }] },
    { type: "p", text: "Plain files can't prevent this, and neither can most simple key-value stores. You need **coordinated operations that either fully succeed or fully fail**. That guarantee is the foundation of SQL databases." },

    { type: "h2", text: "Why SQL databases exist" },
    { type: "p", text: "Production systems hit three related problems that unstructured storage can't solve on its own:" },
    { type: "ol", items: [
      "**Race conditions corrupt data.** Two ticket buyers both read `seats_available = 1` at the same moment, both proceed, and the second write overwrites the first: two customers now hold tickets for one seat. Files and simple stores let both writes succeed. See [optimistic vs pessimistic locking](/learn/optimistic-vs-pessimistic-locking).",
      "**Partial failures leave inconsistent state.** An e-commerce order decrements inventory, takes payment and creates the order. If payment succeeds but the inventory update fails, the store oversells, and someone spends hours or days reconciling by hand.",
      "**Unstructured data drifts.** One engineer stores phone numbers as integers, another as strings with dashes, a third adds country codes. Queries and reports start breaking. An enforced schema stops this drift.",
    ] },
    { type: "p", text: "SQL databases answer all three with **structured schemas** and **transactional guarantees**." },

    { type: "h2", text: "How relational databases work" },
    { type: "p", text: "Each **table** represents one kind of entity (customers, orders, products). Each **row** is one instance, and each **column** is an attribute with a fixed data type. The schema enforces rules **before** data enters the database:" },
    { type: "code", code: `CREATE TABLE Customers (
    CustomerID int PRIMARY KEY,
    Name       varchar(255) NOT NULL,
    Email      varchar(255) UNIQUE,
    Country    varchar(255),
    Balance    decimal(10,2) DEFAULT 0.00
);` },
    { type: "p", text: "`CustomerID` must be a unique integer, `Name` can't be null, `Email` must be unique across all rows, and `Balance` is stored as a decimal with two digits of scale. Trying to insert `\"invalid\"` into `CustomerID` fails immediately." },
    { type: "p", text: "**Primary keys** uniquely identify each row, so no two customers share a `CustomerID`. The database automatically indexes the primary key for fast lookups (see [database indexing](/learn/database-indexing)); without one, you can't reliably update or delete a specific row." },
    { type: "h3", text: "Tables, relationships and foreign keys" },
    { type: "p", text: "Tables link through **foreign keys**. An `Orders` table references `Customers` through `CustomerID`:" },
    { type: "code", code: `CREATE TABLE Orders (
    OrderID    int PRIMARY KEY,
    CustomerID int NOT NULL,
    Amount     decimal(10,2),
    OrderDate  timestamp,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)
);` },
    { type: "diagram", kind: "flow", caption: "Tables and a foreign key: every order's CustomerID must match an existing customer, so orphaned orders can't exist.", nodes: [
      { id: "c", label: "Customers", sub: "CustomerID int PK · Name · Email · Country", col: 0, row: 0, shape: "db", tone: "ok", w: 300 },
      { id: "o", label: "Orders", sub: "OrderID int PK · CustomerID int FK · Amount · OrderDate", col: 2.2, row: 0, shape: "db", tone: "store", w: 340 },
      { id: "cr", label: "Sample customer", sub: "42 · Acme Corp · acme@ex.com · USA", col: 0, row: 1.2, tone: "muted", w: 270 },
      { id: "or", label: "Sample order", sub: "101 · customer 42 · $99.99 · 2024-10-08", col: 2.2, row: 1.2, tone: "muted", w: 280 },
    ], edges: [{ from: "o", to: "c", label: "FOREIGN KEY" }, { from: "or", to: "cr", dashed: true, label: "CustomerID = 42" }] },
    { type: "p", text: "The constraint enforces **referential integrity**: `INSERT INTO Orders (CustomerID) VALUES (999)` fails if customer 999 doesn't exist, so the database never holds orders that point at nobody. Relationships also make cross-table questions easy. All orders for one customer:" },
    { type: "code", code: `SELECT o.OrderID, o.Amount, o.OrderDate
FROM Orders o
JOIN Customers c ON o.CustomerID = c.CustomerID
WHERE c.Email = 'user@example.com';` },
    { type: "p", text: "The database uses indexes to run this join efficiently instead of scanning whole tables. The simplest picture of the idea:" },
    { type: "table", head: ["Users.ID", "Users.Name", "", "Orders.ID", "Orders.UserID"], rows: [
      ["1", "Alice", "", "101", "1 (Alice)"],
      ["2", "Bob", "", "102", "2 (Bob)"],
    ] },
    { type: "h3", text: "Three kinds of relationships" },
    { type: "ul", items: [
      "**One-to-one**: each user has exactly one profile (a `profiles.user_id` that is also unique).",
      "**One-to-many**: one user has many orders (`orders.user_id` references `users.user_id`).",
      "**Many-to-many**: many students enroll in many classes. This needs a **junction table** that stores both `student_id` and `class_id`.",
    ] },
    { type: "code", code: `CREATE TABLE enrollments (
    student_id int REFERENCES students(student_id),
    class_id   int REFERENCES classes(class_id),
    PRIMARY KEY (student_id, class_id)          -- a student can enroll in a class once
);

-- Everyone in class 7, with names
SELECT s.name FROM enrollments e JOIN students s ON s.student_id = e.student_id
WHERE e.class_id = 7;` },

    { type: "h2", text: "ACID transactions" },
    { type: "p", text: "A **transaction** groups several operations into one unit with four guarantees. See [ACID vs BASE](/learn/acid-vs-base) for the contrast with eventually consistent systems." },
    { type: "table", head: ["Property", "Guarantee", "In the bank transfer"], rows: [
      ["**Atomicity**", "All operations complete, or none do", "If crediting B fails, the debit from A is rolled back; money can't vanish"],
      ["**Consistency**", "Each transaction moves the database from one valid state to another; schema rules and constraints hold", "The `Balance >= 100` check means accounts can't go negative"],
      ["**Isolation**", "Concurrent transactions don't see each other's half-finished work", "Nobody reads the moment where A is debited but B isn't credited yet"],
      ["**Durability**", "Once committed, changes survive crashes", "The commit is on disk before the app is told \"success\""],
    ] },
    { type: "code", code: `BEGIN TRANSACTION;
UPDATE Accounts SET Balance = Balance - 100
 WHERE AccountID = 'A' AND Balance >= 100;
UPDATE Accounts SET Balance = Balance + 100
 WHERE AccountID = 'B';
COMMIT;` },
    { type: "diagram", kind: "flow", caption: "The same transfer inside a transaction. Success path: both updates commit (A $400, B $300). Failure path: the second update fails and ROLLBACK restores A to $500. The total is $700 either way.", zones: [{ label: "Success path", from: [0, 0], to: [0, 3], tone: "ok" }, { label: "Failure path: automatic rollback", from: [1.6, 0], to: [1.6, 3], tone: "danger" }], nodes: [
      { id: "a1", label: "BEGIN TRANSACTION", col: 0, row: 0 },
      { id: "a2", label: "UPDATE account A", sub: "$500 → $400", col: 0, row: 1 },
      { id: "a3", label: "UPDATE account B", sub: "$200 → $300", col: 0, row: 2 },
      { id: "a4", label: "COMMIT", sub: "A $400 · B $300 · total $700 ✓", col: 0, row: 3, tone: "ok", w: 230 },
      { id: "b1", label: "BEGIN TRANSACTION", col: 1.6, row: 0 },
      { id: "b2", label: "UPDATE account A", sub: "$500 → $400", col: 1.6, row: 1 },
      { id: "b3", label: "UPDATE account B", sub: "network failure ✗", col: 1.6, row: 2, tone: "danger" },
      { id: "b4", label: "ROLLBACK", sub: "A $500 · B $200 · total $700 ✓", col: 1.6, row: 3, tone: "danger", w: 230 },
    ], edges: [
      { from: "a1", to: "a2" }, { from: "a2", to: "a3" }, { from: "a3", to: "a4" },
      { from: "b1", to: "b2" }, { from: "b2", to: "b3" }, { from: "b3", to: "b4", label: "error" },
    ] },
    { type: "p", text: "Isolation comes in levels that trade correctness for performance; see [transactions and isolation levels](/learn/transactions-isolation-levels)." },
    { type: "p", text: "**Durability through the write-ahead log.** Before changing data files, the database appends each change (old and new value) to a sequential log. After a crash it replays the log to restore a consistent state. Sequential appends are fast, so durability doesn't cost much write performance. See [write-ahead logging](/learn/write-ahead-log)." },

    { type: "h2", text: "Basic SQL operations" },
    { type: "p", text: "Four statements cover everyday work: **SELECT** reads, **INSERT** adds rows, **UPDATE** changes rows and **DELETE** removes them. Combined with transactions, they build complex workflows that stay consistent." },
    { type: "code", code: `-- Read: customers in the USA
SELECT Name, Email FROM Customers WHERE Country = 'USA';

-- Create: add a customer
INSERT INTO Customers (Name, Email, Country)
VALUES ('Acme Corp', 'contact@acme.com', 'USA');

-- Update: change contact details
UPDATE Customers SET Email = 'new@acme.com' WHERE CustomerID = 42;

-- Delete: remove a customer
DELETE FROM Customers WHERE CustomerID = 42;` },

    { type: "h2", text: "When to use a SQL database" },
    { type: "p", text: "SQL databases shine when **relationships and integrity matter more than flexibility**:" },
    { type: "ul", items: [
      "**Financial systems** need atomic multi-account updates: a payment debits one account and credits another, and both must succeed or fail together. See [payment systems and ledgers](/learn/payment-system-ledger).",
      "**E-commerce** manages inventory, orders and customers with strict referential integrity: an order must reference an existing customer and product, inventory decrements must match order creation, and deleting a product with pending orders fails automatically.",
      "**Healthcare** stores patient records, appointments and prescriptions; regulations demand audit trails of who accessed which record and when, which SQL databases support with row-level permissions and transaction logs.",
      "**Reporting** runs complex analytical queries that the query optimizer handles efficiently. In a key-value store, the same question would need application-level processing.",
    ] },
    { type: "code", code: `-- Revenue by product category and region since October 2024
SELECT p.Category, c.Region, SUM(o.Amount) AS Revenue
FROM Orders o
JOIN Customers c ON o.CustomerID = c.CustomerID
JOIN Products  p ON o.ProductID  = p.ProductID
WHERE o.OrderDate >= '2024-10-01'
GROUP BY p.Category, c.Region;` },

    { type: "h2", text: "Popular relational databases" },
    { type: "table", head: ["Database", "Known for", "Typical use"], rows: [
      ["**PostgreSQL**", "The most feature-rich open-source option: custom data types, JSON and arrays, full-text search, custom functions; handles transactions and analytics", "Applications with complex queries or analytics alongside transactions (Instacart runs order processing on it at scale)"],
      ["**MySQL**", "The most widely deployed open-source option: simple, fast reads, straightforward replication", "Web apps, user data and content management, read-heavy workloads with replicas"],
      ["**Oracle Database**", "Enterprise features such as advanced partitioning and multi-version concurrency control", "Mission-critical corporate systems needing high availability"],
      ["**Amazon RDS** (and other managed services)", "Managed PostgreSQL, MySQL and others: backups, patches and scaling handled for you", "Cloud apps that want to avoid operational overhead"],
    ] },

    { type: "h2", text: "Challenges with SQL databases" },
    { type: "h3", text: "Scaling up vs scaling out" },
    { type: "p", text: "One server handles limited throughput. **Vertical scaling** (more CPU, RAM, faster disks) is simple but gets expensive: RAM is priced roughly linearly at commodity tiers, but at the high end doubling from 256 GB to 512 GB can cost more than 2×, and eventually you hit physical limits. See [scalability](/learn/scalability) and [scaling databases](/learn/scaling-databases)." },
    { type: "p", text: "**Horizontal scaling** spreads data over several servers by [sharding](/learn/sharding) on a partition key: users by ID range (IDs 1–1,000,000 on shard A, 1,000,001–2,000,000 on shard B), orders by creation date. Single-user queries stay fast, but queries spanning shards get expensive: cross-shard aggregations query every shard and merge, and joins across servers need network round trips and application-level coordination. Choose partition keys to minimize cross-shard work." },
    { type: "diagram", kind: "flow", caption: "Hash sharding by UserID: the application computes UserID % 3 and sends each user's rows to one of three independent databases.", nodes: [
      { id: "app", label: "Application", sub: "routes by UserID", col: 1, row: 0, tone: "accent" },
      { id: "r", label: "shard = UserID % 3", col: 1, row: 1, shape: "pill" },
      { id: "a", label: "Shard A (server 1)", sub: "3 Alice · 6 David · 9 Grace · 12 Jack", col: 0, row: 2.2, shape: "db", tone: "ok", w: 240 },
      { id: "b", label: "Shard B (server 2)", sub: "1 Bob · 4 Emma · 7 Frank · 10 Henry", col: 1, row: 2.2, shape: "db", tone: "store", w: 240 },
      { id: "c", label: "Shard C (server 3)", sub: "2 Carol · 5 Eve · 8 Iris · 11 Kim", col: 2, row: 2.2, shape: "db", tone: "cache", w: 240 },
    ], edges: [{ from: "app", to: "r" }, { from: "r", to: "a", label: "= 0" }, { from: "r", to: "b", label: "= 1" }, { from: "r", to: "c", label: "= 2" }] },
    { type: "p", text: "[Replication](/learn/replication) helps with reads: write to a primary, and replicas copy the changes and serve reads. That works when reads vastly outnumber writes; write-heavy workloads still bottleneck on the primary." },
    { type: "h3", text: "Schema changes at scale" },
    { type: "p", text: "Adding a column to a billion-row table can lock it for hours. Production teams use **online migration** tools that copy data incrementally while still serving traffic; GitHub's gh-ost is a well-known example. Large migrations are usually done in phases: dual-write to old and new structures, backfill, switch reads, then remove the old path." },
    { type: "h3", text: "Microservices" },
    { type: "p", text: "A monolith typically shares one database. Microservices favor a [database per service](/learn/database-per-service), which improves independence but loses transactions across services; you then need distributed transactions or [sagas](/learn/saga-pattern), which add complexity." },
  ],
  uses: [
    { name: "Payments, banking and ledgers", text: "Atomic debit-and-credit transactions and constraints that stop balances going negative." },
    { name: "E-commerce orders and inventory", text: "Foreign keys tie orders to customers and products; transactions keep stock and orders in step." },
    { name: "Ticketing and booking", text: "Row locks or conditional updates stop two buyers getting the same seat." },
    { name: "Business reporting", text: "Joins, GROUP BY and a query optimizer answer questions nobody planned for when the schema was designed." },
  ],
  interview: [
    "Pick a relational database when the data is relational and correctness needs transactions (money, bookings, inventory), and say so explicitly.",
    "Sketch the main tables with primary and foreign keys, and the indexes for the main queries.",
    "Explain how it scales: replicas for reads, caching, then sharding on a well-chosen key, and what cross-shard queries cost.",
    "Mention online schema migration for large tables and sagas when transactions would have to span services.",
  ],
  related: ["sql-vs-nosql", "acid-vs-base", "transactions-isolation-levels", "database-indexing", "sharding", "replication", "normalization-denormalization", "write-ahead-log"],
  practice: ["ticket-booking", "payment-platform", "url-shortener"],
  reading: [
    { title: "Lessons learned from running Postgres at scale", publisher: "Instacart Tech", url: "https://tech.instacart.com/lessons-learned-from-running-postgres-at-scale-part-1-9edb2c6c8778" },
    { title: "gh-ost: online schema migrations for MySQL", publisher: "GitHub", url: "https://github.com/github/gh-ost" },
    { title: "Online migrations at scale", publisher: "Stripe", url: "https://stripe.com/blog/online-migrations" },
  ],
};
