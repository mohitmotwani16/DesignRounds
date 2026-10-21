// Document databases: the JSON/ORM mismatch they remove, self-contained flexible documents,
// embedding vs referencing, where they fit and where they don't, and MongoDB basics.
export default {
  blocks: [
    { type: "p", text: "A **document database** stores data as JSON-like **documents**: each record is a self-contained object with nested fields and arrays, and different documents in the same collection can have different fields. Key-value stores give simple lookups, but many applications need **nested** data (user profiles with addresses, blog posts with comments, products with specifications) and want to query inside it. Document databases are built for exactly that. MongoDB is the best-known example." },

    { type: "h2", text: "The ORM problem" },
    { type: "p", text: "Douglas Crockford published the JSON specification in 2001, and JSON became the language of the web: browsers send JSON, APIs answer in JSON, services talk JSON to each other. Relational databases, though, store tables and rows." },
    { type: "p", text: "Storing JSON-shaped data in SQL creates friction. A user profile with nested addresses and several phone numbers needs three tables (`users`, `addresses`, `phone_numbers`): saving one profile takes three INSERTs, and reading it back joins three tables. **Object-relational mappers (ORMs)** translate between objects and tables, and they work until they don't: nested arrays need complex mapping, schema migrations break existing code, and performance suffers from the **N+1 query problem**." },
    { type: "diagram", kind: "flow", caption: "With a relational database, an ORM translates every request: JSON objects are mapped to rows on the way in and rows back to JSON on the way out.", nodes: [
      { id: "b", label: "Browser", col: 0, row: 0, shape: "pill" },
      { id: "w", label: "Web app", col: 1.2, row: 0 },
      { id: "o", label: "ORM", sub: "JSON ⇄ tables and rows", col: 2.5, row: 0, tone: "danger" },
      { id: "db", label: "Relational database", col: 3.8, row: 0, shape: "db", tone: "store" },
    ], edges: [{ from: "b", to: "w", label: "JSON", both: true }, { from: "w", to: "o", both: true }, { from: "o", to: "db", label: "SQL", both: true }] },
    { type: "code", code: `# The N+1 problem with an ORM: 1 query for the users, then 1 more per user
users = session.query(User).limit(100).all()          # 1 query
for user in users:
    print(user.name, [a.city for a in user.addresses])  # +100 lazy-loaded queries

# The same data as documents: one query returns users with their addresses embedded
users = db.users.find({}, {"name": 1, "addresses.city": 1}).limit(100)` },

    { type: "h2", text: "How document databases work" },
    { type: "p", text: "Document databases store JSON (or a binary form of it, such as MongoDB's BSON) directly: no translation layer and no ORM. The application sends JSON, the database stores JSON, and reads return JSON." },
    { type: "diagram", kind: "flow", caption: "With a document database, JSON flows end to end: browser, web app and database all speak the same shape.", nodes: [
      { id: "b", label: "Browser", col: 0, row: 0, shape: "pill" },
      { id: "w", label: "Web app", col: 1.3, row: 0 },
      { id: "db", label: "Document database", col: 2.8, row: 0, shape: "db", tone: "ok" },
    ], edges: [{ from: "b", to: "w", label: "JSON", both: true }, { from: "w", to: "db", label: "JSON", both: true }] },
    { type: "ul", items: [
      "**Self-contained documents**: a user profile includes its related data in one document, with addresses and phone numbers nested inside, so one read returns everything.",
      "**Flexible fields**: one user has a verified badge and another doesn't, and the database accepts both. New documents can carry new fields while old documents stay unchanged, with no schema migration.",
      "**Queryable insides**: unlike a key-value store, the database understands the structure, so you can filter, sort and index on nested fields.",
    ] },
    { type: "code", code: `{
  "_id": "u_456",
  "name": "Bob Johnson",
  "email": "bob.johnson@example.com",
  "verified": true,
  "addresses": [
    { "type": "home", "street": "123 Main St", "city": "Springfield" },
    { "type": "work", "street": "9 Market Sq", "city": "Shelbyville" }
  ],
  "phones": ["+1-555-0100", "+1-555-0199"],
  "rewards": []
}` },
    { type: "h3", text: "Embedding vs referencing" },
    { type: "p", text: "The key modeling decision is whether related data lives **inside** a document or in **its own** document, linked by ID:" },
    { type: "table", head: ["", "Embed", "Reference"], rows: [
      ["How", "Nest the data inside the parent (addresses inside the user)", "Store an ID and fetch separately (an order stores `user_id`)"],
      ["Choose when", "Read together, owned by one parent, bounded in size", "Shared by many parents, large or growing without limit, updated independently"],
      ["Example", "A post's tags; a user's few addresses", "A post's comments once they number in the thousands; products referenced by orders"],
      ["Cost", "Duplication if the same data is embedded in many places", "Extra queries (or `$lookup`) to join at read time"],
    ] },

    { type: "h2", text: "When to use a document database" },
    { type: "ul", items: [
      "**User and entity profiles**: self-contained content with no strong relationships. A Reddit profile page shows one user's data, needs no complex queries, and new features add fields (`rewards: []`) without migrations. Merchant profiles on Yelp, venue profiles on Ticketmaster and e-commerce listings follow the same pattern.",
      "**Content management**: a blog post has a title, body and tags array; posts are mostly independent, reading one shouldn't need joins, and flexible schemas allow custom fields per post.",
      "**Product catalogs**: an electronics product has screen size and battery life, clothing has size and material. Both live in the same collection with different fields.",
    ] },
    { type: "code", code: `{ "sku": "tv-55", "category": "electronics", "name": "55\\" OLED TV",
  "specs": { "screen_in": 55, "resolution": "4K", "power_w": 120 } }

{ "sku": "tee-m-blue", "category": "clothing", "name": "Cotton tee",
  "specs": { "size": "M", "material": "100% cotton", "color": "blue" } }` },

    { type: "h2", text: "When not to use one" },
    { type: "p", text: "Avoid document databases when the data needs **strong consistency across many records, complex relationships and strict normalization**. A banking application moving money between accounts needs multi-record ACID transactions; use a [relational database](/learn/relational-databases). (MongoDB does support multi-document transactions, but if most operations need them, the relational model is usually the better fit.) Many-to-many relationships queried from every direction also fit tables better than documents. See [normalization vs denormalization](/learn/normalization-denormalization)." },

    { type: "h2", text: "Try it: MongoDB basics" },
    { type: "p", text: "These commands run in `mongosh` against a local MongoDB (for example `docker run -p 27017:27017 mongo:7`), or in any online MongoDB playground:" },
    { type: "code", code: `// create a collection
db.createCollection("users");

// insert one document, then two more
db.users.insertOne({ name: "John Doe", age: 30, email: "john.doe@example.com" });
db.users.insertMany([
  { name: "Jane Smith", age: 28, email: "jane.smith@example.com" },
  { name: "Bob Johnson", age: 45, email: "bob.johnson@example.com" },
]);

// find all documents, then one specific document
db.users.find();
db.users.findOne({ name: "John Doe" });

// query on a field and index it
db.users.find({ age: { $gt: 29 } }).sort({ age: -1 });
db.users.createIndex({ email: 1 }, { unique: true });

// update a field, then add a brand-new field to one document (no migration)
db.users.updateOne({ name: "John Doe" }, { $set: { age: 31 } });
db.users.updateOne({ name: "John Doe" }, { $set: { address: "123 Main St, Springfield" } });

// delete a document
db.users.deleteOne({ name: "John Doe" });` },
  ],
  uses: [
    { name: "Profiles and listings", text: "User, merchant, venue and product pages that load one self-contained document per view." },
    { name: "Content management", text: "Articles and posts with flexible custom fields and embedded tags." },
    { name: "Product catalogs", text: "Different attributes per category in one collection, indexed on the fields shoppers filter by." },
    { name: "Mobile and web backends", text: "Firestore and similar document stores sync JSON-shaped app state directly to clients." },
  ],
  interview: [
    "Choose a document store when each screen reads one self-contained entity and the fields keep changing.",
    "Say what you embed and what you reference, and why (read together vs shared or unbounded).",
    "Name the indexes for the fields you query on.",
    "Don't use it as the system of record for money or other cross-record invariants; that's a relational job.",
  ],
  related: ["nosql-database-types", "key-value-databases", "relational-databases", "sql-vs-nosql", "normalization-denormalization", "database-indexing"],
  practice: ["news-feed", "paste-service", "recommendation-engine"],
  reading: [
    { title: "Object-relational mapping", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping" },
    { title: "Database normalization", publisher: "Wikipedia", url: "https://en.wikipedia.org/wiki/Database_normalization" },
  ],
};
